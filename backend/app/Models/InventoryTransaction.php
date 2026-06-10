<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryTransaction extends Model
{
    public $timestamps = false; // created_at is handled at database level

    protected $fillable = [
        'ingredient_id', 'order_id', 'transaction_type', 'quantity', 'notes', 'created_at'
    ];

    protected $casts = [
        'quantity' => 'float'
    ];

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class, 'ingredient_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
