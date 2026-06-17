<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\MenuItem;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use App\Models\SystemSetting;
use App\Models\AuditLog;
use App\Events\OrderCreated;
use App\Events\OrderStatusUpdated;
use App\Events\InventoryLowStock;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Store a newly created order in storage (public, no auth).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:100',
            'customer_phone' => 'nullable|string|max:20',
            'table_number' => 'nullable|string|max:10',
            'notes' => 'nullable|string',
            'payment_method' => 'nullable|in:cash,upi,card',
            'items' => 'required|array|min:1',
            'items.*.menu_item_id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Pre-initialize sequence setting outside transaction to ensure collection and document exist
            $sequenceSetting = SystemSetting::where('key', 'order_sequence')->first();
            if (!$sequenceSetting) {
                SystemSetting::create([
                    'key' => 'order_sequence',
                    'value' => '0'
                ]);
            }

            // Pre-initialize tax percentage setting if missing
            $taxPercentageSetting = SystemSetting::where('key', 'tax_percentage')->first();
            if (!$taxPercentageSetting) {
                SystemSetting::create([
                    'key' => 'tax_percentage',
                    'value' => '7.5'
                ]);
            }

            $order = DB::transaction(function() use ($request) {
                // 1. Get and increment sequence number safely inside transaction
                $sequenceSetting = SystemSetting::where('key', 'order_sequence')->first();
                if (!$sequenceSetting) {
                    throw new \Exception("System setting 'order_sequence' is missing or failed to initialize.");
                }
                $seqVal = (int) $sequenceSetting->value + 1;
                $sequenceSetting->value = (string) $seqVal;
                $sequenceSetting->save();

                // 2. Generate Order Number: GC-YYYY-XXXXXX
                $year = date('Y');
                $paddedSeq = str_pad($seqVal, 6, '0', STR_PAD_LEFT);
                $orderNumber = "GC-{$year}-{$paddedSeq}";

                // 3. Read tax rate
                $taxPercentageSetting = SystemSetting::where('key', 'tax_percentage')->first();
                $taxRate = $taxPercentageSetting ? (float) $taxPercentageSetting->value : 7.5;

                // 4. Calculate Subtotal, Tax, and Total
                $subtotal = 0;
                $orderItemsData = [];

                foreach ($request->input('items') as $itemData) {
                    $menuItem = MenuItem::find($itemData['menu_item_id']);
                    
                    // Check availability
                    if (!$menuItem->is_available) {
                        throw new \Exception("Item '{$menuItem->name}' is currently out of stock and cannot be ordered.");
                    }

                    $itemPrice = (float) $menuItem->price;
                    $qty = (int) $itemData['quantity'];
                    $itemSubtotal = $itemPrice * $qty;
                    $subtotal += $itemSubtotal;

                    $orderItemsData[] = [
                        'menu_item_id' => $menuItem->id,
                        'item_name' => $menuItem->name,
                        'item_price' => $itemPrice,
                        'quantity' => $qty,
                        'subtotal' => $itemSubtotal
                    ];
                }

                $tax = round($subtotal * $taxRate / 100, 2);
                $total = $subtotal + $tax;

                // 5. Create Order
                $order = Order::create([
                    'order_number' => $orderNumber,
                    'customer_name' => $request->input('customer_name'),
                    'customer_phone' => $request->input('customer_phone'),
                    'table_number' => $request->input('table_number'),
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'total' => $total,
                    'tax_rate' => $taxRate,
                    'notes' => $request->input('notes'),
                    'payment_method' => $request->input('payment_method', 'cash'),
                    'staff_id' => null
                ]);

                // 6. Save Order Items
                foreach ($orderItemsData as $orderItem) {
                    $orderItem['order_id'] = $order->id;
                    OrderItem::create($orderItem);
                }

                return $order;
            });

            // Fire OrderCreated Broadcast Event
            broadcast(new OrderCreated($order))->toOthers();

            // Write Audit Log
            AuditLog::create([
                'user_id' => null,
                'user_name' => 'Customer (' . $order->customer_name . ')',
                'action' => 'place_order',
                'entity_type' => 'order',
                'entity_id' => $order->id,
                'new_value' => $order->load('items')->toArray(),
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'data' => $order->load('items')
            ], 201);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 400);
        }
    }

    /**
     * Track order status (public).
     */
    public function track($order_number)
    {
        $order = Order::with('items')->where('order_number', $order_number)->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order,
            'message' => 'Order tracking data retrieved'
        ]);
    }

    /**
     * Fetch list of orders (staff/admin only).
     */
    public function index(Request $request)
    {
        $query = Order::with(['items', 'staff']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        } else {
            // By default, staff shows active/uncompleted orders in queue
            $query->whereIn('status', ['pending', 'accepted', 'preparing', 'ready']);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
            'message' => 'Orders retrieved successfully'
        ]);
    }

    /**
     * Update order status (staff only).
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,accepted,preparing,ready,served,cancelled'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldStatus = $order->status;
        $newStatus = $request->input('status');

        // Validate status transition flow
        // Flow: pending → accepted → preparing → ready → served
        // Cancelled from any status except served.
        if ($oldStatus === 'served') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change status of an already served order.'
            ], 400);
        }

        if ($newStatus === $oldStatus) {
            return response()->json([
                'success' => true,
                'data' => $order->load('items'),
                'message' => 'Status is already ' . $newStatus
            ]);
        }

        // Validate transition order (if it is not cancelled)
        if ($newStatus !== 'cancelled') {
            $valid = false;
            if ($oldStatus === 'pending' && $newStatus === 'accepted') $valid = true;
            elseif ($oldStatus === 'accepted' && $newStatus === 'preparing') $valid = true;
            elseif ($oldStatus === 'preparing' && $newStatus === 'ready') $valid = true;
            elseif ($oldStatus === 'ready' && $newStatus === 'served') $valid = true;

            if (!$valid) {
                return response()->json([
                    'success' => false,
                    'message' => "Invalid status transition from '{$oldStatus}' to '{$newStatus}'."
                ], 400);
            }
        }

        try {
            $user = request()->user('api') ?? auth()->user();

            DB::transaction(function() use ($order, $newStatus, $oldStatus, $request, $user) {
                $oldValue = $order->toArray();

                $order->status = $newStatus;

                // If accepted, link staff who accepted it
                if ($newStatus === 'accepted') {
                    $order->staff_id = $user ? $user->id : null;
                    
                    // Deduct Inventory Auto-Deduction!
                    $this->deductInventory($order);
                }

                $order->save();

                // Write Audit Log
                AuditLog::create([
                    'user_id' => $user ? $user->id : null,
                    'user_name' => $user ? $user->name : 'Guest Customer',
                    'action' => 'update_order_status',
                    'entity_type' => 'order',
                    'entity_id' => $order->id,
                    'old_value' => $oldValue,
                    'new_value' => $order->toArray(),
                    'ip_address' => $request->ip()
                ]);
            });

            // Fire OrderStatusUpdated Broadcast Event
            broadcast(new OrderStatusUpdated($order))->toOthers();

            return response()->json([
                'success' => true,
                'data' => $order->load('items'),
                'message' => "Order status updated to '{$newStatus}' successfully"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Cancel/Delete Order (admin only).
     */
    public function destroy(Request $request, $id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        if ($order->status === 'served') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel a served order.'
            ], 400);
        }

        $oldValue = $order->toArray();
        $order->status = 'cancelled';
        $order->save();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'cancel_order',
            'entity_type' => 'order',
            'entity_id' => $order->id,
            'old_value' => $oldValue,
            'new_value' => $order->toArray(),
            'ip_address' => $request->ip()
        ]);

        // Broadcast status update
        broadcast(new OrderStatusUpdated($order))->toOthers();

        return response()->json([
            'success' => true,
            'data' => $order->load('items'),
            'message' => 'Order cancelled successfully'
        ]);
    }

    /**
     * Helper to deduct inventory based on menu ingredients.
     */
    private function deductInventory(Order $order)
    {
        foreach ($order->items as $orderItem) {
            // Find ingredient relations for this menu item
            $menuItem = MenuItem::find($orderItem->menu_item_id);
            if (!$menuItem) continue;

            $ingredientsPivot = DB::table('menu_item_ingredients')
                                  ->where('menu_item_id', $menuItem->id)
                                  ->get();

            foreach ($ingredientsPivot as $pivot) {
                $ingredient = Ingredient::find($pivot->ingredient_id);
                if (!$ingredient) continue;

                $qtyToDeduct = (float) $pivot->quantity_used * (int) $orderItem->quantity;

                // Deduct from current_stock
                $oldStock = (float) $ingredient->current_stock;
                $newStock = $oldStock - $qtyToDeduct;
                $ingredient->current_stock = $newStock;
                $ingredient->save();

                // Write Inventory Transaction record
                InventoryTransaction::create([
                    'ingredient_id' => $ingredient->id,
                    'order_id' => $order->id,
                    'transaction_type' => 'deduction',
                    'quantity' => $qtyToDeduct,
                    'notes' => "Auto-deduction for Order #{$order->order_number} ({$orderItem->quantity} x {$orderItem->item_name})"
                ]);

                // Check if current stock goes below minimum stock
                if ($newStock < (float) $ingredient->minimum_stock) {
                    // Fire Low Stock Event
                    broadcast(new InventoryLowStock($ingredient))->toOthers();
                }
            }
        }
    }

    /**
     * Send WhatsApp message directly (background/server-side).
     */
    public function sendWhatsApp(Request $request, $id)
    {
        $order = Order::with('items')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        // Get Whatsapp settings
        $whatsappSetting = SystemSetting::where('key', 'whatsapp_number')->first();
        $recipientNumber = $whatsappSetting ? $whatsappSetting->value : '+917907937153';

        // Build Plain-Text message
        $tokenNumber = explode('-', $order->order_number);
        $tokenNumber = end($tokenNumber);

        $message = "🌿 *GREENY CAFE ORDER*\n\n";
        $message .= "*Order ID:* {$order->order_number}\n";
        $message .= "*Token Number:* #{$tokenNumber}\n";
        $message .= "*Customer:* {$order->customer_name}\n";
        if ($order->customer_phone) $message .= "*Phone:* {$order->customer_phone}\n";
        if ($order->table_number) $message .= "*Table:* {$order->table_number}\n";
        $message .= "*Payment:* " . strtoupper($order->payment_method ?: 'CASH') . "\n\n";
        
        $message .= "*Items:*\n";
        foreach ($order->items as $item) {
            $message .= "{$item->quantity} x {$item->item_name} (₹{$item->item_price})\n";
        }
        $message .= "\n";
        $message .= "*Subtotal:* ₹{$order->subtotal}\n";
        $message .= "*Tax:* ₹{$order->tax}\n";
        $message .= "*Total:* ₹{$order->total}\n\n";
        $message .= "*Status:* {$order->status}\n";

        // Twilio Credentials
        $sid = config('services.twilio.sid') ?: getenv('TWILIO_SID');
        $token = config('services.twilio.auth_token') ?: getenv('TWILIO_AUTH_TOKEN');
        $from = config('services.twilio.whatsapp_from') ?: getenv('TWILIO_WHATSAPP_FROM');

        $sentReal = false;
        $errorMessage = null;

        if ($sid && $token && $from) {
            try {
                // Ensure recipient number is formatted properly for Twilio WhatsApp (e.g. +917907937153)
                $cleanRecipient = preg_replace('/[^0-9+]/', '', $recipientNumber);
                if (strpos($cleanRecipient, '+') !== 0) {
                    $cleanRecipient = '+' . $cleanRecipient;
                }

                // Ensure From is prefixed with 'whatsapp:'
                $cleanFrom = $from;
                if (strpos($cleanFrom, 'whatsapp:') !== 0) {
                    $cleanFrom = 'whatsapp:' . $cleanFrom;
                }

                // Ensure To is prefixed with 'whatsapp:'
                $cleanTo = "whatsapp:{$cleanRecipient}";

                $twilioUrl = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
                $response = \Illuminate\Support\Facades\Http::withBasicAuth($sid, $token)
                    ->asForm()
                    ->post($twilioUrl, [
                        'From' => $cleanFrom,
                        'To' => $cleanTo,
                        'Body' => $message
                    ]);

                if ($response->successful()) {
                    $sentReal = true;
                    \Illuminate\Support\Facades\Log::info("WhatsApp message sent successfully via Twilio to {$cleanRecipient}.");
                } else {
                    $errorMessage = $response->json()['message'] ?? $response->body();
                    \Illuminate\Support\Facades\Log::error("Failed to send WhatsApp message via Twilio: " . $errorMessage);
                }
            } catch (\Exception $e) {
                $errorMessage = $e->getMessage();
                \Illuminate\Support\Facades\Log::error("Twilio request exception: " . $errorMessage);
            }
        } else {
            // Log local simulated dispatch
            \Illuminate\Support\Facades\Log::info("Simulated WhatsApp message sent to {$recipientNumber}:\n{$message}");
        }

        // Write to Audit Logs
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->check() ? auth()->user()->name : 'Customer (' . $order->customer_name . ')',
            'action' => 'send_whatsapp_notification',
            'entity_type' => 'order',
            'entity_id' => $order->id,
            'new_value' => [
                'recipient' => $recipientNumber,
                'sent_real' => $sentReal,
                'error_message' => $errorMessage,
                'message_body' => $message
            ],
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => $sentReal || !$sid,
            'recipient' => $recipientNumber,
            'sent_real' => $sentReal,
            'error_message' => $errorMessage,
            'message' => $sentReal 
                ? "WhatsApp message sent directly to {$recipientNumber}!" 
                : ($sid 
                    ? "Twilio Error: {$errorMessage}" 
                    : "Sandbox Mode: WhatsApp message logged to server files (configure Twilio in settings to send for real).")
        ]);
    }
}
