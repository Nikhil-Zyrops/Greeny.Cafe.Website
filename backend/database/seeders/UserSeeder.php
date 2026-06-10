<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@greeny.cafe',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'status' => 'active',
            'phone' => '+919999999999'
        ]);

        User::create([
            'name' => 'Manager',
            'email' => 'manager@greeny.cafe',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '+918888888888'
        ]);

        User::create([
            'name' => 'Staff 1',
            'email' => 'staff1@greeny.cafe',
            'password' => Hash::make('password'),
            'role' => 'staff',
            'status' => 'active',
            'phone' => '+917777777777'
        ]);

        User::create([
            'name' => 'Staff 2',
            'email' => 'staff2@greeny.cafe',
            'password' => Hash::make('password'),
            'role' => 'staff',
            'status' => 'active',
            'phone' => '+916666666666'
        ]);
    }
}
