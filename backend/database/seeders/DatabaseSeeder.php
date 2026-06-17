<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Ensure unique indexes are created for MongoDB
        if (config('database.default') === 'mongodb') {
            \Illuminate\Support\Facades\Schema::connection('mongodb')->table('users', function ($collection) {
                $collection->unique('email');
            });
            \Illuminate\Support\Facades\Schema::connection('mongodb')->table('menu_categories', function ($collection) {
                $collection->unique('slug');
            });
            \Illuminate\Support\Facades\Schema::connection('mongodb')->table('menu_items', function ($collection) {
                $collection->unique('slug');
            });
            \Illuminate\Support\Facades\Schema::connection('mongodb')->table('ingredients', function ($collection) {
                $collection->unique('slug');
            });
        }

        $this->call([
            UserSeeder::class,
            MenuItemSeeder::class,
            InventorySeeder::class,
        ]);
    }
}
