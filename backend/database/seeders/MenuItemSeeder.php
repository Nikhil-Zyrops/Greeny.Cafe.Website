<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use Illuminate\Support\Str;

class MenuItemSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Categories
        $drinksCategory = MenuCategory::create([
            'name' => 'Drinks',
            'slug' => 'drinks',
            'sort_order' => 1
        ]);

        $snacksCategory = MenuCategory::create([
            'name' => 'Snacks',
            'slug' => 'snacks',
            'sort_order' => 2
        ]);

        $drinksId = $drinksCategory->id;
        $snacksId = $snacksCategory->id;

        // 2. Seed 40 Menu Items
        $items = [
            // Drinks - Hot
            ['name' => 'Green Tea', 'price' => 80.00, 'emoji' => '🍵', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Herbal Tea', 'price' => 90.00, 'emoji' => '🌿', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Lemon Tea', 'price' => 75.00, 'emoji' => '🍋', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Ginger Tea', 'price' => 80.00, 'emoji' => '🫚', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Mint Tea', 'price' => 85.00, 'emoji' => '🌱', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Espresso', 'price' => 100.00, 'emoji' => '☕', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Black Coffee', 'price' => 90.00, 'emoji' => '☕', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Cappuccino', 'price' => 130.00, 'emoji' => '☕', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Latte', 'price' => 140.00, 'emoji' => '🥛', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Mocha', 'price' => 150.00, 'emoji' => '🍫', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],

            // Drinks - Cold
            ['name' => 'Iced Coffee', 'price' => 120.00, 'emoji' => '🧊', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Cold Brew', 'price' => 160.00, 'emoji' => '🫙', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Mango Smoothie', 'price' => 140.00, 'emoji' => '🥭', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Strawberry Smoothie', 'price' => 150.00, 'emoji' => '🍓', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Banana Shake', 'price' => 130.00, 'emoji' => '🍌', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Watermelon Juice', 'price' => 110.00, 'emoji' => '🍉', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Fresh Orange Juice', 'price' => 120.00, 'emoji' => '🍊', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Lime Soda', 'price' => 90.00, 'emoji' => '🍈', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Mint Cooler', 'price' => 100.00, 'emoji' => '💚', 'popular' => false, 'cat' => $drinksId, 'type' => 'veg'],
            ['name' => 'Green Detox Drink', 'price' => 160.00, 'emoji' => '🥤', 'popular' => true, 'cat' => $drinksId, 'type' => 'veg'],

            // Snacks - Veg
            ['name' => 'Veg Sandwich', 'price' => 120.00, 'emoji' => '🥪', 'popular' => true, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Paneer Sandwich', 'price' => 150.00, 'emoji' => '🥪', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Veg Burger', 'price' => 160.00, 'emoji' => '🍔', 'popular' => true, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Paneer Burger', 'price' => 180.00, 'emoji' => '🍔', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Garlic Bread', 'price' => 100.00, 'emoji' => '🥖', 'popular' => true, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Cheese Toast', 'price' => 110.00, 'emoji' => '🧀', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Mushroom Roll', 'price' => 140.00, 'emoji' => '🍄', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Veg Puff', 'price' => 80.00, 'emoji' => '🥐', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Veg Momos', 'price' => 130.00, 'emoji' => '🥟', 'popular' => true, 'cat' => $snacksId, 'type' => 'veg'],
            ['name' => 'Corn Cups', 'price' => 90.00, 'emoji' => '🌽', 'popular' => false, 'cat' => $snacksId, 'type' => 'veg'],

            // Snacks - Non-Veg
            ['name' => 'Chicken Sandwich', 'price' => 170.00, 'emoji' => '🥪', 'popular' => true, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Burger', 'price' => 200.00, 'emoji' => '🍔', 'popular' => true, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Wrap', 'price' => 190.00, 'emoji' => '🌯', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Roll', 'price' => 160.00, 'emoji' => '🌯', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Nuggets', 'price' => 180.00, 'emoji' => '🍗', 'popular' => true, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Popcorn', 'price' => 160.00, 'emoji' => '🍿', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Puff', 'price' => 120.00, 'emoji' => '🥐', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Chicken Momos', 'price' => 160.00, 'emoji' => '🥟', 'popular' => true, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Egg Sandwich', 'price' => 130.00, 'emoji' => '🥚', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
            ['name' => 'Egg Roll', 'price' => 120.00, 'emoji' => '🥚', 'popular' => false, 'cat' => $snacksId, 'type' => 'nonveg'],
        ];

        foreach ($items as $item) {
            $slug = Str::slug($item['name']);
            // The image_url will point to a generated picture path in frontend
            $image_url = '/images/menu/' . $slug . '.jpg';

            MenuItem::create([
                'name' => $item['name'],
                'slug' => $slug,
                'description' => 'Fresh and delicious ' . strtolower($item['name']) . ' prepared with nature-inspired high quality ingredients.',
                'category_id' => $item['cat'],
                'food_type' => $item['type'],
                'price' => $item['price'],
                'image_url' => $image_url,
                'emoji' => $item['emoji'],
                'is_available' => true,
                'stock_quantity' => 100,
                'is_popular' => $item['popular']
            ]);
        }
    }
}
