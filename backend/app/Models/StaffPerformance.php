<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffPerformance extends Model
{
    protected $table = 'staff_performance';

    protected $fillable = [
        'staff_id', 'date', 'orders_completed', 'orders_cancelled',
        'total_active_minutes', 'avg_completion_minutes', 'efficiency_score'
    ];

    protected $casts = [
        'orders_completed' => 'integer',
        'orders_cancelled' => 'integer',
        'total_active_minutes' => 'integer',
        'avg_completion_minutes' => 'float',
        'efficiency_score' => 'float'
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
