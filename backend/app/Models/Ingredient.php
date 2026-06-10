<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingredient extends Model
{
    protected $fillable = ['name', 'unit', 'current_stock', 'minimum_stock', 'cost_per_unit'];

    protected $casts = [
        'current_stock' => 'float',
        'minimum_stock' => 'float',
        'cost_per_unit' => 'float'
    ];

    public function menuItems(): BelongsToMany
    {
        return $this->belongsToMany(MenuItem::class, 'menu_item_ingredients', 'ingredient_id', 'menu_item_id')
                    ->withPivot('quantity_used')
                    ->withTimestamps();
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'ingredient_id');
    }
}
