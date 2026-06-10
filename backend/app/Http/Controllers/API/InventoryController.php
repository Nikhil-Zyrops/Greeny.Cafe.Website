<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ingredient;
use App\Models\InventoryTransaction;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Display a listing of the resource (admin only).
     */
    public function index()
    {
        $ingredients = Ingredient::all()->map(function($ing) {
            // Determine status: Out of Stock, Low Stock, OK
            $status = 'OK';
            if ($ing->current_stock <= 0) {
                $status = 'Out of Stock';
            } elseif ($ing->current_stock < $ing->minimum_stock) {
                $status = 'Low Stock';
            }
            $ing->status = $status;
            return $ing;
        });

        // Compute summary values
        $totalItems = $ingredients->count();
        $lowStockCount = $ingredients->where('status', 'Low Stock')->count();
        $outOfStockCount = $ingredients->where('status', 'Out of Stock')->count();
        $totalValue = $ingredients->sum(function($ing) {
            return $ing->current_stock * $ing->cost_per_unit;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'ingredients' => $ingredients,
                'summary' => [
                    'total_items' => $totalItems,
                    'low_stock_count' => $lowStockCount,
                    'out_of_stock_count' => $outOfStockCount,
                    'total_value' => round($totalValue, 2)
                ]
            ],
            'message' => 'Inventory retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage (admin only).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:ingredients,name',
            'unit' => 'required|string|max:20',
            'current_stock' => 'required|numeric|min:0',
            'minimum_stock' => 'required|numeric|min:0',
            'cost_per_unit' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $ingredient = Ingredient::create($request->all());

        // Write an initial transaction for restock if current_stock > 0
        if ($ingredient->current_stock > 0) {
            InventoryTransaction::create([
                'ingredient_id' => $ingredient->id,
                'transaction_type' => 'restock',
                'quantity' => $ingredient->current_stock,
                'notes' => 'Initial stock on creation'
            ]);
        }

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'create_ingredient',
            'entity_type' => 'ingredient',
            'entity_id' => $ingredient->id,
            'new_value' => $ingredient->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $ingredient,
            'message' => 'Ingredient created successfully'
        ], 201);
    }

    /**
     * Update the specified resource in storage (admin only).
     */
    public function update(Request $request, $id)
    {
        $ingredient = Ingredient::find($id);

        if (!$ingredient) {
            return response()->json([
                'success' => false,
                'message' => 'Ingredient not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100|unique:ingredients,name,' . $id,
            'unit' => 'string|max:20',
            'current_stock' => 'numeric|min:0',
            'minimum_stock' => 'numeric|min:0',
            'cost_per_unit' => 'numeric|min:0',
            'restock_quantity' => 'numeric|min:0' // helper to easily restock
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldValue = $ingredient->toArray();

        // Perform updates
        DB::transaction(function() use ($request, $ingredient, $oldValue) {
            if ($request->filled('restock_quantity')) {
                $restockQty = (float) $request->input('restock_quantity');
                $ingredient->current_stock += $restockQty;
                
                InventoryTransaction::create([
                    'ingredient_id' => $ingredient->id,
                    'transaction_type' => 'restock',
                    'quantity' => $restockQty,
                    'notes' => $request->input('notes', 'Manual restock update')
                ]);
            }

            $ingredient->update($request->except(['restock_quantity', 'notes']));
        });

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'update_ingredient',
            'entity_type' => 'ingredient',
            'entity_id' => $ingredient->id,
            'old_value' => $oldValue,
            'new_value' => $ingredient->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $ingredient,
            'message' => 'Ingredient updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage (admin only).
     */
    public function destroy(Request $request, $id)
    {
        $ingredient = Ingredient::find($id);

        if (!$ingredient) {
            return response()->json([
                'success' => false,
                'message' => 'Ingredient not found'
            ], 404);
        }

        $oldValue = $ingredient->toArray();
        $ingredient->delete();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'delete_ingredient',
            'entity_type' => 'ingredient',
            'entity_id' => $id,
            'old_value' => $oldValue,
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ingredient deleted successfully'
        ]);
    }
}
