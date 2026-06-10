<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MenuItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'description', 'category_id', 'food_type',
        'price', 'image_url', 'emoji', 'is_available', 'stock_quantity',
        'is_popular'
    ];

    protected $casts = [
        'price' => 'float',
        'is_available' => 'boolean',
        'is_popular' => 'boolean',
        'stock_quantity' => 'integer'
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(MenuCategory::class, 'category_id');
    }

    public function ingredients(): BelongsToMany
    {
        return $this->belongsToMany(Ingredient::class, 'menu_item_ingredients', 'menu_item_id', 'ingredient_id')
                    ->withPivot('quantity_used')
                    ->withTimestamps();
    }
}
