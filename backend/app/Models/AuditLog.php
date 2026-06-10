<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public $timestamps = false; // created_at is handled at database level

    protected $fillable = [
        'user_id', 'user_name', 'action', 'entity_type', 'entity_id',
        'old_value', 'new_value', 'ip_address', 'created_at'
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
