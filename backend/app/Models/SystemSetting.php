<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = ['key', 'value'];
}
