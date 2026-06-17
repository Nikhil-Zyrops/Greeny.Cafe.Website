<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\SystemSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tymon\JWTAuth\Facades\JWTAuth;

class BackupRestoreTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        
        if (!extension_loaded('mongodb')) {
            $this->markTestSkipped('MongoDB extension is not loaded.');
        }
        
        // Run migrations for testing mongodb database
        $this->artisan('migrate');
    }

    public function test_non_super_admin_cannot_access_backup_endpoints(): void
    {
        // 1. Unauthenticated test
        $response = $this->getJson('/super/backups');
        $response->assertStatus(401);

        $response = $this->postJson('/super/backup');
        $response->assertStatus(401);

        // 2. Staff role test
        $staffUser = User::create([
            'name' => 'Test Staff',
            'email' => 'teststaff@greeny.cafe',
            'password' => bcrypt('password'),
            'role' => 'staff',
            'status' => 'active'
        ]);

        $token = JWTAuth::fromUser($staffUser);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/super/backups');
        $response->assertStatus(403);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/super/backup');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_perform_json_backup_and_restore(): void
    {
        // Create super admin
        $superAdmin = User::create([
            'name' => 'Test Super Admin',
            'email' => 'testadmin@greeny.cafe',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
            'status' => 'active'
        ]);

        // Create some settings
        SystemSetting::create([
            'key' => 'whatsapp_number',
            'value' => '+919999999999'
        ]);

        $token = JWTAuth::fromUser($superAdmin);

        // 1. Trigger backup
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/super/backup');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'filename',
                'size',
                'created_at'
            ],
            'message' => 'Database backup completed successfully'
        ]);

        $filename = $response->json('data.filename');
        $filepath = storage_path('app/backups/' . $filename);

        $this->assertTrue(File::exists($filepath));

        // 2. Clear settings to verify restore
        SystemSetting::truncate();
        $this->assertEquals(0, SystemSetting::count());

        // 3. Trigger restore by uploading the file
        $uploadedFile = new UploadedFile(
            $filepath,
            $filename,
            'application/json',
            null,
            true // test mode
        );

        $restoreResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/super/restore', [
                'backup_file' => $uploadedFile
            ]);

        $restoreResponse->assertStatus(200);
        $restoreResponse->assertJson([
            'success' => true,
            'message' => 'Database restored successfully'
        ]);

        // 4. Verify settings are restored
        $this->assertEquals(1, SystemSetting::count());
        $setting = SystemSetting::where('key', 'whatsapp_number')->first();
        $this->assertEquals('+919999999999', $setting->value);

        // Clean up backup file
        if (File::exists($filepath)) {
            File::delete($filepath);
        }
    }

    public function test_bson_serialization_helper_methods_work(): void
    {
        // Only run this check if the BSON classes are available (e.g. on Vercel/production)
        if (!class_exists('\MongoDB\BSON\ObjectId') || !class_exists('\MongoDB\BSON\UTCDateTime')) {
            $this->markTestSkipped('MongoDB extension is not loaded in this environment.');
            return;
        }

        $controller = new \App\Http\Controllers\API\SuperAdminController();
        $reflector = new \ReflectionClass($controller);

        $serializeMethod = $reflector->getMethod('serializeMongoData');
        $serializeMethod->setAccessible(true);

        $deserializeMethod = $reflector->getMethod('deserializeMongoData');
        $deserializeMethod->setAccessible(true);

        $oid = new \MongoDB\BSON\ObjectId();
        $now = new \MongoDB\BSON\UTCDateTime(new \DateTime());

        $originalData = [
            'id' => $oid,
            'created_at' => $now,
            'nested' => [
                'id' => $oid,
                'scalar' => 'hello'
            ]
        ];

        // Serialize
        $serialized = $serializeMethod->invoke($controller, $originalData);

        $this->assertEquals('oid', $serialized['id']['$type']);
        $this->assertEquals((string)$oid, $serialized['id']['value']);
        $this->assertEquals('date', $serialized['created_at']['$type']);
        $this->assertEquals('oid', $serialized['nested']['id']['$type']);
        $this->assertEquals('hello', $serialized['nested']['scalar']);

        // Deserialize
        $deserialized = $deserializeMethod->invoke($controller, $serialized);

        $this->assertInstanceOf(\MongoDB\BSON\ObjectId::class, $deserialized['id']);
        $this->assertEquals((string)$oid, (string)$deserialized['id']);
        $this->assertInstanceOf(\MongoDB\BSON\UTCDateTime::class, $deserialized['created_at']);
        $this->assertInstanceOf(\MongoDB\BSON\ObjectId::class, $deserialized['nested']['id']);
        $this->assertEquals('hello', $deserialized['nested']['scalar']);
    }
}

