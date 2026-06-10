<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\MenuItemController;
use App\Http\Controllers\API\OrderController;
use App\Http\Controllers\API\InventoryController;
use App\Http\Controllers\API\AnalyticsController;
use App\Http\Controllers\API\SuperAdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==========================================
// 1. PUBLIC ROUTES
// ==========================================
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/super/settings', [SuperAdminController::class, 'settingsIndex']); // dynamically filters public vs super_admin

Route::get('/menu', [MenuItemController::class, 'index']);
Route::get('/menu/{id}', [MenuItemController::class, 'show']);

Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/{order_number}/track', [OrderController::class, 'track']);
Route::post('/orders/{id}/whatsapp', [OrderController::class, 'sendWhatsApp']);


// ==========================================
// 2. AUTHENTICATED ROUTES
// ==========================================
Route::middleware('auth:api')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // ------------------------------------------
    // Staff & Above Routes (Staff, Admin, Super Admin)
    // ------------------------------------------
    Route::middleware('role:staff,admin,super_admin')->group(function () {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::get('/staff/performance', [AnalyticsController::class, 'staffPerformance']);
    });

    // ------------------------------------------
    // Admin & Above Routes (Admin, Super Admin)
    // ------------------------------------------
    Route::middleware('role:admin,super_admin')->group(function () {
        // Menu CRUD
        Route::post('/menu', [MenuItemController::class, 'store']);
        Route::put('/menu/{id}', [MenuItemController::class, 'update']);
        Route::delete('/menu/{id}', [MenuItemController::class, 'destroy']);
        Route::patch('/menu/{id}/toggle', [MenuItemController::class, 'toggle']);

        // Order Cancel
        Route::delete('/orders/{id}', [OrderController::class, 'destroy']);

        // Inventory CRUD
        Route::get('/inventory', [InventoryController::class, 'index']);
        Route::post('/inventory', [InventoryController::class, 'store']);
        Route::put('/inventory/{id}', [InventoryController::class, 'update']);
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy']);

        // Analytics
        Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
        Route::get('/analytics/calendar', [AnalyticsController::class, 'calendar']);
        Route::get('/analytics/top-items', [AnalyticsController::class, 'topItems']);
        Route::get('/analytics/peak-hours', [AnalyticsController::class, 'peakHours']);
        Route::get('/analytics/weekly-revenue', [AnalyticsController::class, 'weeklyRevenue']);
    });

    // ------------------------------------------
    // Super Admin Only Routes
    // ------------------------------------------
    Route::middleware('role:super_admin')->group(function () {
        // Users CRUD
        Route::get('/super/users', [SuperAdminController::class, 'usersIndex']);
        Route::post('/super/users', [SuperAdminController::class, 'usersStore']);
        Route::put('/super/users/{id}', [SuperAdminController::class, 'usersUpdate']);
        Route::patch('/super/users/{id}/status', [SuperAdminController::class, 'usersToggleStatus']);
        Route::delete('/super/users/{id}', [SuperAdminController::class, 'usersDestroy']);

        // Global Settings Update
        Route::put('/super/settings', [SuperAdminController::class, 'settingsUpdate']);

        // Audit Logs
        Route::get('/super/audit-logs', [SuperAdminController::class, 'auditLogsIndex']);

        // Backup and Restore
        Route::get('/super/backups', [SuperAdminController::class, 'backupHistory']);
        Route::post('/super/backup', [SuperAdminController::class, 'runBackup']);
        Route::post('/super/restore', [SuperAdminController::class, 'restoreBackup']);
    });
});
