<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->foreignId('category_id')->constrained('menu_categories')->onDelete('cascade');
            $table->enum('food_type', ['veg', 'nonveg']);
            $table->decimal('price', 8, 2);
            $table->string('image_url')->nullable();
            $table->string('emoji', 10)->nullable();
            $table->boolean('is_available')->default(true);
            $table->integer('stock_quantity')->default(100);
            $table->boolean('is_popular')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
    }
};
