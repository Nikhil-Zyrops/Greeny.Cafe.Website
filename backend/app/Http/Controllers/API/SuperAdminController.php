<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\SystemSetting;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class SuperAdminController extends Controller
{
    /**
     * User Management: GET list of users.
     */
    public function usersIndex()
    {
        $users = User::where('id', '!=', auth()->id())->get(); // hide current user

        return response()->json([
            'success' => true,
            'data' => $users,
            'message' => 'Users list retrieved'
        ]);
    }

    /**
     * User Management: CREATE new user.
     */
    public function usersStore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|in:staff,admin,super_admin',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->input('name'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
            'phone' => $request->input('phone'),
            'status' => 'active'
        ]);

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'create_user',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'new_value' => $user->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'User created successfully'
        ], 201);
    }

    /**
     * User Management: UPDATE user.
     */
    public function usersUpdate(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100',
            'email' => 'email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'in:staff,admin,super_admin',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldValue = $user->toArray();

        $user->name = $request->input('name', $user->name);
        $user->email = $request->input('email', $user->email);
        $user->role = $request->input('role', $user->role);
        $user->phone = $request->input('phone', $user->phone);

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        $user->save();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'update_user',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'old_value' => $oldValue,
            'new_value' => $user->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'User updated successfully'
        ]);
    }

    /**
     * User Management: TOGGLE status (suspend/activate).
     */
    public function usersToggleStatus(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        $oldValue = $user->toArray();
        $user->status = $user->status === 'active' ? 'suspended' : 'active';
        $user->save();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'toggle_user_status',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'old_value' => $oldValue,
            'new_value' => $user->toArray(),
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $user,
            'message' => 'User status toggled successfully to ' . $user->status
        ]);
    }

    /**
     * User Management: DELETE user.
     */
    public function usersDestroy(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }

        $oldValue = $user->toArray();
        $user->delete();

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'delete_user',
            'entity_type' => 'user',
            'entity_id' => $id,
            'old_value' => $oldValue,
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);
    }

    /**
     * Settings: GET global settings.
     */
    public function settingsIndex()
    {
        if (auth()->check() && auth()->user()->role === 'super_admin') {
            $settings = SystemSetting::all()->pluck('value', 'key');
        } else {
            // Public access: only expose basic details needed by customer page
            $settings = SystemSetting::whereIn('key', ['whatsapp_number', 'cafe_name', 'currency', 'tax_percentage', 'logo_url'])
                                      ->pluck('value', 'key');
        }

        return response()->json([
            'success' => true,
            'data' => $settings,
            'message' => 'System settings retrieved'
        ]);
    }

    /**
     * Settings: PUT update settings.
     */
    public function settingsUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cafe_name' => 'string|max:100',
            'tax_percentage' => 'numeric|min:0|max:100',
            'whatsapp_number' => 'string|max:20',
            'currency' => 'string|max:10',
            'auto_backup_enabled' => 'string|in:true,false',
            'mail_id' => 'nullable|string|max:100',
            'mail_password' => 'nullable|string|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldSettings = SystemSetting::all()->pluck('value', 'key')->toArray();

        foreach ($request->all() as $key => $val) {
            $setting = SystemSetting::where('key', $key)->first();
            if ($setting) {
                $setting->value = (string) $val;
                $setting->save();
            } else {
                SystemSetting::create(['key' => $key, 'value' => (string) $val]);
            }
        }

        $newSettings = SystemSetting::all()->pluck('value', 'key')->toArray();

        if ($request->has('whatsapp_number')) {
            $newPhone = (string) $request->input('whatsapp_number');

            $fileReplacements = [
                base_path('database/seeders/InventorySeeder.php') => [
                    'pattern' => '/\'whatsapp_number\'\s*=>\s*\'[^\']+\'/',
                    'replacement' => "'whatsapp_number' => '" . $newPhone . "'"
                ],
                app_path('Http/Controllers/API/OrderController.php') => [
                    'pattern' => '/\$recipientNumber\s*=\s*\$whatsappSetting\s*\?\s*\$whatsappSetting->value\s*:\s*\'[^\']+\'/',
                    'replacement' => '$recipientNumber = $whatsappSetting ? $whatsappSetting->value : \'' . $newPhone . '\''
                ],
                base_path('api/index.php') => [
                    'pattern' => '/(\'key\',\s*\'whatsapp_number\'\)->update\(\\[\'value\'\s*=>\s*\')[^\']+(\'\\]\))/',
                    'replacement' => '${1}' . $newPhone . '${2}'
                ],
                base_path('../frontend/app/customer/page.tsx') => [
                    'pattern' => '/(\[whatsappNumber,\s*setWhatsappNumber\]\s*=\s*useState\(\s*")[^"]+("\))/',
                    'replacement' => '${1}' . $newPhone . '${2}'
                ],
                base_path('../frontend/app/super-admin/page.tsx') => [
                    'pattern' => '/(\[whatsappNumber,\s*setWhatsappNumber\]\s*=\s*useState\(\s*")[^"]+("\))/',
                    'replacement' => '${1}' . $newPhone . '${2}'
                ]
            ];

            foreach ($fileReplacements as $filePath => $replacementInfo) {
                try {
                    if (File::exists($filePath)) {
                        $content = File::get($filePath);
                        $pattern = $replacementInfo['pattern'];
                        $rep = $replacementInfo['replacement'];
                        $newContent = preg_replace($pattern, $rep, $content);
                        if ($newContent !== null && $newContent !== $content) {
                            File::put($filePath, $newContent);
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::warning("Failed to permanently update WhatsApp number in {$filePath}: " . $e->getMessage());
                }
            }
        }

        if ($request->has('mail_id') || $request->has('mail_password')) {
            $mailId = (string) $request->input('mail_id', '');
            $mailPassword = (string) $request->input('mail_password', '');

            // 1. Update database seeder file
            $seederPath = base_path('database/seeders/InventorySeeder.php');
            try {
                if (File::exists($seederPath)) {
                    $content = File::get($seederPath);
                    
                    // Replace mail_id (handles both empty and non-empty default values)
                    if ($request->has('mail_id')) {
                        $content = preg_replace('/(\'mail_id\'\s*=>\s*\')[^\']*(\')/', '${1}' . $mailId . '${2}', $content);
                    }
                    // Replace mail_password
                    if ($request->has('mail_password')) {
                        $content = preg_replace('/(\'mail_password\'\s*=>\s*\')[^\']*(\')/', '${1}' . $mailPassword . '${2}', $content);
                    }
                    
                    File::put($seederPath, $content);
                }
            } catch (\Throwable $e) {
                \Log::warning("Failed to permanently update Mail settings in seeder: " . $e->getMessage());
            }

            // 2. Update .env file
            $envPath = base_path('.env');
            try {
                if (File::exists($envPath)) {
                    $content = File::get($envPath);
                    
                    // Replace MAIL_USERNAME
                    if ($request->has('mail_id')) {
                        $valStr = empty($mailId) ? 'null' : (str_contains($mailId, ' ') ? '"' . $mailId . '"' : $mailId);
                        $content = preg_replace('/MAIL_USERNAME=[^\r\n]*/', 'MAIL_USERNAME=' . $valStr, $content);
                    }
                    // Replace MAIL_PASSWORD
                    if ($request->has('mail_password')) {
                        $valStr = empty($mailPassword) ? 'null' : (str_contains($mailPassword, ' ') ? '"' . $mailPassword . '"' : $mailPassword);
                        $content = preg_replace('/MAIL_PASSWORD=[^\r\n]*/', 'MAIL_PASSWORD=' . $valStr, $content);
                    }
                    
                    File::put($envPath, $content);
                }
            } catch (\Throwable $e) {
                \Log::warning("Failed to permanently update Mail settings in .env: " . $e->getMessage());
            }
        }

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'update_system_settings',
            'entity_type' => 'settings',
            'old_value' => $oldSettings,
            'new_value' => $newSettings,
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => $newSettings,
            'message' => 'System settings updated successfully'
        ]);
    }

    /**
     * Audit Logs: GET audit logs.
     */
    public function auditLogsIndex()
    {
        $logs = AuditLog::orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $logs,
            'message' => 'Audit logs retrieved'
        ]);
    }

    /**
     * Backup: Run a database backup (super_admin).
     */
    public function runBackup(Request $request)
    {
        $backupDir = storage_path('app/backups');
        if (!File::exists($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $filename = 'backup_' . date('Y_m_d_H_i_s') . '.sql';
        $filepath = $backupDir . '/' . $filename;

        // Path to mysqldump.exe
        $mysqldumpPath = 'C:\Codes\Greeny-Cafe\mariadb\bin\mysqldump.exe';

        if (!File::exists($mysqldumpPath)) {
            return response()->json([
                'success' => false,
                'message' => 'MariaDB mysqldump utility not found. Cannot perform backup.'
            ], 500);
        }

        // Run backup shell command
        // Note: MariaDB root user has no password in our setup
        $cmd = "\"{$mysqldumpPath}\" -h 127.0.0.1 -u root greeny_cafe > \"{$filepath}\"";
        
        exec($cmd, $output, $resultCode);

        if ($resultCode !== 0) {
            return response()->json([
                'success' => false,
                'message' => 'Database backup failed with exit code ' . $resultCode
            ], 500);
        }

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'database_backup',
            'entity_type' => 'backup',
            'new_value' => ['filename' => $filename, 'path' => $filepath],
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'filename' => $filename,
                'size' => round(filesize($filepath) / 1024, 2) . ' KB',
                'created_at' => date('Y-m-d H:i:s')
            ],
            'message' => 'Database backup completed successfully'
        ]);
    }

    /**
     * Restore: Restore database from uploaded SQL backup file.
     */
    public function restoreBackup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'backup_file' => 'required|file'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'No backup file provided or file upload failed.',
                'errors' => $validator->errors()
            ], 422);
        }

        $file = $request->file('backup_file');
        
        // Save file to a temp location
        $tempPath = $file->storeAs('temp', 'restore.sql');
        $absolutePath = storage_path('app/' . $tempPath);

        // Path to mysql.exe
        $mysqlPath = 'C:\Codes\Greeny-Cafe\mariadb\bin\mysql.exe';

        if (!File::exists($mysqlPath)) {
            return response()->json([
                'success' => false,
                'message' => 'MariaDB mysql utility not found. Cannot perform restore.'
            ], 500);
        }

        // Run mysql restore shell command
        $cmd = "\"{$mysqlPath}\" -h 127.0.0.1 -u root greeny_cafe < \"{$absolutePath}\"";
        
        exec($cmd, $output, $resultCode);

        // Clean up temp file
        Storage::delete($tempPath);

        if ($resultCode !== 0) {
            return response()->json([
                'success' => false,
                'message' => 'Database restore failed with exit code ' . $resultCode
            ], 500);
        }

        // Write Audit Log
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()->name,
            'action' => 'database_restore',
            'entity_type' => 'restore',
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Database restored successfully'
        ]);
    }

    /**
     * Get backup history list.
     */
    public function backupHistory()
    {
        $backupDir = storage_path('app/backups');
        $backups = [];

        if (File::exists($backupDir)) {
            $files = File::files($backupDir);
            foreach ($files as $file) {
                if ($file->getExtension() === 'sql') {
                    $backups[] = [
                        'filename' => $file->getFilename(),
                        'size' => round($file->getSize() / 1024, 2) . ' KB',
                        'time' => date('Y-m-d H:i:s', $file->getMTime())
                    ];
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $backups,
            'message' => 'Backup list retrieved'
        ]);
    }
}
