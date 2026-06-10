<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Ingredient;
use App\Models\MenuItem;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\DB;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Ingredients
        $ingredients = [
            'Coffee Beans' => ['unit' => 'g', 'current' => 1000.0, 'min' => 200.0, 'cost' => 0.50],
            'Milk'         => ['unit' => 'ml', 'current' => 5000.0, 'min' => 1000.0, 'cost' => 0.05],
            'Mint Leaves'  => ['unit' => 'g', 'current' => 500.0, 'min' => 100.0, 'cost' => 0.20],
            'Bread'        => ['unit' => 'pcs', 'current' => 40.0, 'min' => 10.0, 'cost' => 5.00],
            'Chicken'      => ['unit' => 'g', 'current' => 4000.0, 'min' => 500.0, 'cost' => 0.30],
            'Paneer'       => ['unit' => 'g', 'current' => 800.0, 'min' => 200.0, 'cost' => 0.40],
            'Cheese'       => ['unit' => 'g', 'current' => 300.0, 'min' => 50.0, 'cost' => 0.60],
            'Mango Pulp'   => ['unit' => 'ml', 'current' => 80.0, 'min' => 500.0, 'cost' => 0.80], // low stock!
        ];

        $ingredientIds = [];
        foreach ($ingredients as $name => $data) {
            $ing = Ingredient::create([
                'name' => $name,
                'unit' => $data['unit'],
                'current_stock' => $data['current'],
                'minimum_stock' => $data['min'],
                'cost_per_unit' => $data['cost']
            ]);
            $ingredientIds[$name] = $ing->id;
        }

        // 2. Link Menu Items to Ingredients (Pivot Table)
        $links = [
            'Espresso' => [
                'Coffee Beans' => 15.0
            ],
            'Black Coffee' => [
                'Coffee Beans' => 10.0
            ],
            'Cappuccino' => [
                'Coffee Beans' => 15.0,
                'Milk' => 150.0
            ],
            'Latte' => [
                'Coffee Beans' => 15.0,
                'Milk' => 200.0
            ],
            'Mocha' => [
                'Coffee Beans' => 15.0,
                'Milk' => 150.0,
                'Cheese' => 10.0 // representation of chocolate/topping cost if not separated
            ],
            'Iced Coffee' => [
                'Coffee Beans' => 15.0,
                'Milk' => 150.0
            ],
            'Cold Brew' => [
                'Coffee Beans' => 20.0
            ],
            'Green Tea' => [
                'Mint Leaves' => 5.0
            ],
            'Mint Cooler' => [
                'Mint Leaves' => 10.0
            ],
            'Mango Smoothie' => [
                'Mango Pulp' => 100.0,
                'Milk' => 150.0
            ],
            'Veg Sandwich' => [
                'Bread' => 2.0,
                'Cheese' => 20.0
            ],
            'Paneer Sandwich' => [
                'Bread' => 2.0,
                'Cheese' => 20.0,
                'Paneer' => 50.0
            ],
            'Chicken Sandwich' => [
                'Bread' => 2.0,
                'Cheese' => 20.0,
                'Chicken' => 80.0
            ],
            'Veg Burger' => [
                'Bread' => 2.0, // bun
                'Cheese' => 20.0
            ],
            'Paneer Burger' => [
                'Bread' => 2.0, // bun
                'Cheese' => 20.0,
                'Paneer' => 60.0
            ],
            'Chicken Burger' => [
                'Bread' => 2.0, // bun
                'Cheese' => 20.0,
                'Chicken' => 100.0
            ],
            'Garlic Bread' => [
                'Bread' => 4.0,
                'Cheese' => 30.0
            ],
            'Cheese Toast' => [
                'Bread' => 2.0,
                'Cheese' => 40.0
            ],
            'Chicken Nuggets' => [
                'Chicken' => 150.0
            ],
            'Chicken Popcorn' => [
                'Chicken' => 120.0
            ],
        ];

        foreach ($links as $itemName => $ingList) {
            $menuItem = MenuItem::where('name', $itemName)->first();
            if ($menuItem) {
                foreach ($ingList as $ingName => $qty) {
                    if (isset($ingredientIds[$ingName])) {
                        DB::table('menu_item_ingredients')->insert([
                            'menu_item_id' => $menuItem->id,
                            'ingredient_id' => $ingredientIds[$ingName],
                            'quantity_used' => $qty,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }

        // 3. Seed System Settings
        $settings = [
            'cafe_name' => 'Greeny Cafe',
            'tax_percentage' => '7.5',
            'whatsapp_number' => '+917907937153',
            'currency' => 'INR',
            'logo_url' => '/images/logo.png',
            'auto_backup_enabled' => 'true',
            'order_sequence' => '0',
            'mail_id' => '',
            'mail_password' => ''
        ];

        foreach ($settings as $key => $val) {
            SystemSetting::create([
                'key' => $key,
                'value' => $val
            ]);
        }
    }
}
