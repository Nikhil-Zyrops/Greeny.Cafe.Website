<?php

// 1. Ensure SQLite database exists in writable /tmp directory
$dbPath = '/tmp/database.sqlite';
if (!file_exists($dbPath)) {
    touch($dbPath);
}

// 2. Create required storage directories in /tmp
$storageDirs = [
    '/tmp/framework/views',
    '/tmp/framework/sessions',
    '/tmp/framework/cache',
    '/tmp/logs',
];
foreach ($storageDirs as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}

define('LARAVEL_START', microtime(true));

// 3. Register the Composer autoloader
require __DIR__.'/../vendor/autoload.php';

// 4. Bootstrap Laravel
/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

// 5. Override storage path to writable /tmp
$app->useStoragePath('/tmp');

// 6. Programmatically run seeders if MongoDB database is empty
try {
    /** @var \Illuminate\Contracts\Console\Kernel $consoleKernel */
    $consoleKernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    $consoleKernel->bootstrap();

    if (\App\Models\User::count() === 0) {
        // Run seeders (which also ensures unique indexes are created first)
        $consoleKernel->call('db:seed', ['--force' => true]);
    }
} catch (\Throwable $e) {
    header('Content-Type: text/plain');
    echo "Artisan initialization failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
    exit;
}


// 7. Handle the request
$app->handleRequest(\Illuminate\Http\Request::capture());
