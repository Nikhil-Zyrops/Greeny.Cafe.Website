<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_performance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->onDelete('cascade');
            $table->date('date');
            $table->integer('orders_completed')->default(0);
            $table->integer('orders_cancelled')->default(0);
            $table->integer('total_active_minutes')->default(0);
            $table->decimal('avg_completion_minutes', 5, 2)->default(0.00);
            $table->decimal('efficiency_score', 5, 2)->default(0.00);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_performance');
    }
};
