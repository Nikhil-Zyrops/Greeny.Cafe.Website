<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MenuItem;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use App\Models\AuditLog;

class MenuItemController extends Controller
{
    /**
     * Display a listing of the resource (public with filtering/sorting).
     */
    public function index(Request $request)
    {
        $query = MenuItem::with('category');

        // Search by name or description
        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter by category slug
        if ($request->filled('category')) {
            $categorySlug = $request->query('category');
            $query->whereHas('category', function($q) use ($categorySlug) {
                $q->where('slug', $categorySlug);
            });
        }

        // Filter by food type (veg / nonveg)
        if ($request->filled('type')) {
            $type = $request->query('type');
            if (in_array($type, ['veg', 'nonveg'])) {
                $query->where('food_type', $type);
            }
        }

        // Filter by availability (all, available, out_of_stock)
        if ($request->filled('available')) {
            $avail = $request->query('available');
            if ($avail === 'true' || $avail === '1') {
                $query->where('is_available', true);
            } elseif ($avail === 'false' || $avail === '0') {
                $query->where('is_available', false);
            }
        }

        // Sort items
        $sort = $request->query('sort', 'name_asc');
        switch ($sort) {
            case 'popularity':
                $query->orderBy('is_popular', 'desc')->orderBy('name', 'asc');
                break;
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'name_desc':
                $query->orderBy('name', 'desc');
                break;
            case 'name_asc':
            default:
                $query->orderBy('name', 'asc');
                break;
        }

        $items = $query->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'message' => 'Menu items retrieved successfully'
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $item = MenuItem::with(['category', 'ingredients'])->find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Menu item not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Menu item retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage (admin only).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:menu_items,name',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:menu_categories,id',
            'food_type' => 'required|in:veg,nonveg',
            'price' => 'required|numeric|min:0',
            'emoji' => 'nullable|string|max:10',
            'is_available' => 'boolean',
            'stock_quantity' => 'integer|min:0',
            'is_popular' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['slug'] = Str::slug($data['name']);
        // Assign a default picture path if image_url is not set
        $data['image_url'] = '/images/menu/' . $data['slug'] . '.jpg';

        $item = MenuItem::create($data);

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'create_menu_item',
            'entity_type' => 'menu_item',
            'entity_id' => $item->id,
            'new_value' => $item->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Menu item created successfully'
        ], 201);
    }

    /**
     * Update the specified resource in storage (admin only).
     */
    public function update(Request $request, $id)
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Menu item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100|unique:menu_items,name,' . $id,
            'description' => 'nullable|string',
            'category_id' => 'exists:menu_categories,id',
            'food_type' => 'in:veg,nonveg',
            'price' => 'numeric|min:0',
            'emoji' => 'nullable|string|max:10',
            'is_available' => 'boolean',
            'stock_quantity' => 'integer|min:0',
            'is_popular' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldValue = $item->toArray();

        $data = $request->all();
        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
            $data['image_url'] = '/images/menu/' . $data['slug'] . '.jpg';
        }

        $item->update($data);

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'update_menu_item',
            'entity_type' => 'menu_item',
            'entity_id' => $item->id,
            'old_value' => $oldValue,
            'new_value' => $item->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Menu item updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage (admin only, soft delete).
     */
    public function destroy(Request $request, $id)
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Menu item not found'
            ], 404);
        }

        $oldValue = $item->toArray();
        $item->delete();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'delete_menu_item',
            'entity_type' => 'menu_item',
            'entity_id' => $id,
            'old_value' => $oldValue,
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Menu item deleted successfully'
        ]);
    }

    /**
     * Toggle availability of the menu item (admin only).
     */
    public function toggle(Request $request, $id)
    {
        $item = MenuItem::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Menu item not found'
            ], 404);
        }

        $oldValue = $item->toArray();
        $item->is_available = !$item->is_available;
        $item->save();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'toggle_menu_item_availability',
            'entity_type' => 'menu_item',
            'entity_id' => $item->id,
            'old_value' => $oldValue,
            'new_value' => $item->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $item,
            'message' => 'Menu item availability toggled successfully'
        ]);
    }
}
