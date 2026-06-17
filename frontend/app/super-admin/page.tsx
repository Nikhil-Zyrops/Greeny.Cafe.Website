"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { User, AuditLog } from "@/types";
import Topbar from "@/components/common/Topbar";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  Users, Settings, ShieldAlert, Database, Plus, Trash2, Edit, 
  Download, Upload
} from "lucide-react";

interface BackupFile {
  filename: string;
  size: string;
  time: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { initialize } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"users" | "settings" | "audit" | "backup">("users");
  const [loading, setLoading] = useState(true);

  // States for lists
  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);

  // Form states for settings
  const [cafeName, setCafeName] = useState("Greeny Cafe");
  const [taxPercentage, setTaxPercentage] = useState("7.5");
  const [whatsappNumber, setWhatsappNumber] = useState("+917907937153");
  const [currency, setCurrency] = useState("INR");
  const [autoBackupEnabled, setAutoBackupEnabled] = useState("true");
  const [mailId, setMailId] = useState("");
  const [mailPassword, setMailPassword] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Form states for user CRUD
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [uRole, setURole] = useState<"staff" | "admin" | "super_admin">("staff");
  const [uPhone, setUPhone] = useState("");
  const [userActionLoading, setUserActionLoading] = useState(false);

  // Backup restore states
  const [backupLoading, setBackupLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Verify super admin auth
  useEffect(() => {
    initialize();
    const t = localStorage.getItem("token");
    const uStr = localStorage.getItem("user");

    if (!t || !uStr) {
      router.push("/login");
      return;
    }

    try {
      const u = JSON.parse(uStr);
      if (u.role !== "super_admin") {
        router.push("/customer");
        return;
      }
      setLoading(false);
    } catch {
      router.push("/login");
    }
  }, [initialize, router]);

  const loadData = async () => {
    try {
      // 1. Load users
      const usersRes = await api.get("/super/users");
      if (usersRes.data.success) setUsersList(usersRes.data.data);

      // 2. Load settings
      const settingsRes = await api.get("/super/settings");
      if (settingsRes.data.success) {
        const settings = settingsRes.data.data;
        if (settings.cafe_name) setCafeName(settings.cafe_name);
        if (settings.tax_percentage) setTaxPercentage(settings.tax_percentage);
        if (settings.whatsapp_number) setWhatsappNumber(settings.whatsapp_number);
        if (settings.currency) setCurrency(settings.currency);
        if (settings.auto_backup_enabled) setAutoBackupEnabled(settings.auto_backup_enabled);
        if (settings.mail_id) setMailId(settings.mail_id);
        if (settings.mail_password) setMailPassword(settings.mail_password);
      }

      // 3. Load Audit Logs
      const logsRes = await api.get("/super/audit-logs");
      if (logsRes.data.success) setAuditLogs(logsRes.data.data);

      // 4. Load Backups
      const backupsRes = await api.get("/super/backups");
      if (backupsRes.data.success) setBackups(backupsRes.data.data);

    } catch (err) {
      console.error("Error loading super admin data:", err);
    }
  };

  useEffect(() => {
    if (loading) return;
    loadData();
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="ml-2">Verifying super admin credentials...</p>
      </div>
    );
  }

  // User Save (Create/Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName || !uEmail || (!editingUser && !uPassword)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const payload: { name: string; email: string; role: string; phone?: string; password?: string } = {
      name: uName,
      email: uEmail,
      role: uRole,
      phone: uPhone || undefined
    };

    if (uPassword) payload.password = uPassword;

    setUserActionLoading(true);
    try {
      if (editingUser) {
        // Update user
        const res = await api.put(`/super/users/${editingUser.id}`, payload);
        if (res.data.success) {
          toast.success("User updated successfully!");
          loadData();
        }
      } else {
        // Create user
        const res = await api.post("/super/users", payload);
        if (res.data.success) {
          toast.success("User created successfully!");
          loadData();
        }
      }
      setIsUserModalOpen(false);
      resetUserForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to save user.");
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleEditUserClick = (usr: User) => {
    setEditingUser(usr);
    setUName(usr.name);
    setUEmail(usr.email);
    setUPassword("");
    setURole(usr.role as "staff" | "admin" | "super_admin");
    setUPhone(usr.phone || "");
    setIsUserModalOpen(true);
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUName("");
    setUEmail("");
    setUPassword("");
    setURole("staff");
    setUPhone("");
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const res = await api.delete(`/super/users/${id}`);
        if (res.data.success) {
          toast.success("User deleted successfully.");
          loadData();
        }
      } catch {
        toast.error("Failed to delete user.");
      }
    }
  };

  const handleToggleUserStatus = async (id: number) => {
    try {
      const res = await api.patch(`/super/users/${id}/status`);
      if (res.data.success) {
        toast.success("User status changed successfully.");
        loadData();
      }
    } catch {
      toast.error("Failed to toggle status.");
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    const payload = {
      cafe_name: cafeName,
      tax_percentage: parseFloat(taxPercentage),
      whatsapp_number: whatsappNumber,
      currency: currency,
      auto_backup_enabled: autoBackupEnabled,
      mail_id: mailId,
      mail_password: mailPassword
    };

    try {
      const res = await api.put("/super/settings", payload);
      if (res.data.success) {
        toast.success("Global system settings updated successfully!");
        loadData();
      }
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Run Backup manual
  const handleRunBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.post("/super/backup");
      if (res.data.success) {
        toast.success("Database backup generated successfully!");
        loadData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to trigger backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  // Restore Backup
  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please choose a SQL backup file first.");
      return;
    }

    if (!confirm("WARNING: Restoring will overwrite the current database. Proceed?")) {
      return;
    }

    const formData = new FormData();
    formData.append("backup_file", uploadFile);

    setRestoreLoading(true);
    try {
      const res = await api.post("/super/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        toast.success("Database restored successfully!");
        loadData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Restore failed.");
    } finally {
      setRestoreLoading(false);
      setUploadFile(null);
    }
  };

  // Custom colors for audit actions
  const getActionColor = (action: string) => {
    if (action.includes("create")) return "bg-green-500/10 text-green-700 border border-green-500/20";
    if (action.includes("delete")) return "bg-red-500/10 text-red-600 border border-red-500/20";
    if (action.includes("update")) return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    return "bg-blue-500/10 text-blue-700 border border-blue-500/20";
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg transition-colors">
      <Toaster position="top-right" richColors />
      <Topbar />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-[220px] shrink-0 space-y-3">
          <div className="flex flex-col gap-1 bg-surface border border-border p-2 rounded-2xl">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "users" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Users size={16} />
              User Management
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "settings" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Settings size={16} />
              Global Settings
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "audit" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <ShieldAlert size={16} />
              Audit Logs
            </button>
            <button
              onClick={() => setActiveTab("backup")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "backup" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Database size={16} />
              Backup & Restore
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === "users" && (
                <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-bold font-display text-text">Staff & Admin Users</h2>
                <Button 
                  onClick={() => { resetUserForm(); setIsUserModalOpen(true); }}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs flex items-center gap-1 h-8 shadow-sm"
                >
                  <Plus size={14} /> Add User
                </Button>
              </div>

              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-12 text-center text-text-3 font-semibold">Avatar</TableHead>
                        <TableHead className="text-text-3 font-semibold">Name</TableHead>
                        <TableHead className="text-text-3 font-semibold">Role</TableHead>
                        <TableHead className="text-text-3 font-semibold">Email</TableHead>
                        <TableHead className="text-text-3 font-semibold text-center">Status</TableHead>
                        <TableHead className="text-text-3 font-semibold text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersList.map((usr) => (
                        <TableRow key={usr.id} className="border-border/60 hover:bg-surface-2/40">
                          <TableCell className="text-center">
                            <span className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center font-bold text-primary">
                              {usr.name.slice(0, 2).toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-text">{usr.name}</TableCell>
                          <TableCell>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                              usr.role === 'super_admin' 
                                ? 'bg-red-500/10 text-red-600 border border-red-500/20' 
                                : usr.role === 'admin' 
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                                : 'bg-primary-subtle text-primary border border-primary-light/20'
                            }`}>
                              {usr.role.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-text-2 font-medium">{usr.email}</TableCell>
                          <TableCell className="text-center">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              usr.status === 'active' 
                                ? 'bg-green-500/10 text-green-700 border border-green-500/20' 
                                : 'bg-destructive/10 text-destructive border border-destructive/20'
                            }`}>
                              {usr.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-4 space-x-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleToggleUserStatus(usr.id)}
                              className={`text-[9px] font-bold px-2.5 h-7 rounded-lg ${
                                usr.status === 'active' 
                                  ? 'border-destructive text-destructive hover:bg-destructive/5' 
                                  : 'border-green-600 text-green-600 hover:bg-green-600/5'
                              }`}
                            >
                              {usr.status === 'active' ? "Suspend" : "Activate"}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditUserClick(usr)}
                              className="h-7 w-7 text-text-2 hover:text-primary hover:bg-primary-subtle/30 rounded-lg"
                            >
                              <Edit size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteUser(usr.id)}
                              className="h-7 w-7 text-text-2 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 size={12} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Add/Edit User Modal */}
              <Dialog open={isUserModalOpen} onOpenChange={(open) => !open && setIsUserModalOpen(false)}>
                <DialogContent className="sm:max-w-[420px] border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-lg font-bold text-primary">
                      {editingUser ? "Edit User Details" : "Create User Account"}
                    </DialogTitle>
                    <DialogDescription className="text-text-3">
                      Register a staff or manager account on the POS.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSaveUser} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-2">Full Name</label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={uName}
                        onChange={(e) => setUName(e.target.value)}
                        required
                        className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-2">Email Address</label>
                      <Input
                        type="email"
                        placeholder="e.g. john@greeny.cafe"
                        value={uEmail}
                        onChange={(e) => setUEmail(e.target.value)}
                        required
                        className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-2">
                        Password {editingUser && "(Leave blank to keep current)"}
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={uPassword}
                        onChange={(e) => setUPassword(e.target.value)}
                        required={!editingUser}
                        className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Role</label>
                        <select
                          value={uRole}
                          onChange={(e) => setURole(e.target.value as "staff" | "admin" | "super_admin")}
                          className="flex h-9 w-full rounded-lg border border-input bg-surface px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="staff">👨‍🍳 Staff</option>
                          <option value="admin">📊 Admin</option>
                          <option value="super_admin">⚙️ Super Admin</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Phone Number</label>
                        <Input
                          placeholder="+919876543210"
                          value={uPhone}
                          onChange={(e) => setUPhone(e.target.value)}
                          className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                        />
                      </div>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsUserModalOpen(false)}
                        className="border-border rounded-lg text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={userActionLoading}
                        className="bg-primary hover:bg-primary/95 text-white rounded-lg font-bold text-xs px-4"
                      >
                        {userActionLoading ? "Saving..." : "Save User"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ==========================================
              TAB: GLOBAL SETTINGS
              ========================================== */}
          {activeTab === "settings" && (
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-lg font-bold font-display text-text border-b border-border/60 pb-3 mb-6 flex items-center gap-1.5">
                  <Settings size={18} className="text-primary" />
                  Global System Configuration
                </h2>

                <form onSubmit={handleSaveSettings} className="space-y-6 max-w-xl text-xs font-sans">
                  {/* Identity */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-text-2 text-xs border-l-2 border-primary pl-2 uppercase tracking-wide">
                      Cafe Identity
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold text-text-2">Cafe Name</label>
                        <Input
                          value={cafeName}
                          onChange={(e) => setCafeName(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-text-2">Currency Symbol/Code</label>
                        <Input
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-text-2 text-xs border-l-2 border-primary pl-2 uppercase tracking-wide">
                      WhatsApp Integration
                    </h3>
                    <div className="space-y-1">
                      <label className="font-semibold text-text-2">WhatsApp Redirect Phone Number</label>
                      <Input
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        required
                        placeholder="+919999999999"
                        className="border-border text-xs focus-visible:ring-primary rounded-lg"
                      />
                      <span className="text-[10px] text-text-3 block italic mt-1 leading-normal">
                        Note: Include country code without formatting characters (e.g. +919876543210). Customers will be redirected via wa.me link containing thermal POS receipts summaries.
                      </span>
                    </div>
                  </div>

                  {/* Mail Configuration */}
                  <div className="space-y-4 pt-2">
                    <h3 className="font-bold text-text-2 text-xs border-l-2 border-primary pl-2 uppercase tracking-wide">
                      Mail Configuration (SMTP)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold text-text-2">Mail ID / SMTP Username</label>
                        <Input
                          value={mailId}
                          onChange={(e) => setMailId(e.target.value)}
                          placeholder="smtp-user@greeny.cafe"
                          className="border-border text-xs focus-visible:ring-primary rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-text-2">Mail Password / SMTP Password</label>
                        <Input
                          type="password"
                          value={mailPassword}
                          onChange={(e) => setMailPassword(e.target.value)}
                          placeholder="••••••••"
                          className="border-border text-xs focus-visible:ring-primary rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-text-2 text-xs border-l-2 border-primary pl-2 uppercase tracking-wide">
                      Tax & Billing
                    </h3>
                    <div className="space-y-1">
                      <label className="font-semibold text-text-2">Default Tax Rate (GST %)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(e.target.value)}
                        required
                        className="border-border text-xs focus-visible:ring-primary rounded-lg"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={saveLoading}
                    className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg px-6 shadow-md"
                  >
                    {saveLoading ? "Saving Settings..." : "Save Configuration"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ==========================================
              TAB: AUDIT LOGS
              ========================================== */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold font-display text-text px-1">System Audit Trail</h2>
              
              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-text-3 font-semibold">Timestamp</TableHead>
                        <TableHead className="text-text-3 font-semibold">User</TableHead>
                        <TableHead className="text-text-3 font-semibold">Action</TableHead>
                        <TableHead className="text-text-3 font-semibold">Entity Type</TableHead>
                        <TableHead className="text-text-3 font-semibold">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-text-3">No logs found.</TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((log) => (
                          <TableRow key={log.id} className="border-border/60 hover:bg-surface-2/40">
                            <TableCell className="font-mono text-text-3">
                              {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                            </TableCell>
                            <TableCell className="font-bold text-text">{log.user_name}</TableCell>
                            <TableCell>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${getActionColor(log.action)}`}>
                                {log.action.replace("_", " ")}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-text-2 capitalize">{log.entity_type}</TableCell>
                            <TableCell className="font-mono text-text-3">{log.ip_address || "127.0.0.1"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==========================================
              TAB: BACKUP & RESTORE
              ========================================== */}
          {activeTab === "backup" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-xs">
              {/* Controls Column */}
              <div className="lg:col-span-1 space-y-6">
                {/* Backup Generation Card */}
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-2 flex items-center gap-1.5">
                      <Database size={16} className="text-primary" />
                      Manual Database Backup
                    </h3>
                    <p className="text-text-3 text-[11px] leading-normal">
                      Export a full sql dump of all schemas, items, users, and orders history instantly.
                    </p>
                    <Button
                      onClick={handleRunBackup}
                      disabled={backupLoading}
                      className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg w-full flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      {backupLoading ? "Generating..." : "Generate Backup"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Restore database Card */}
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-2 flex items-center gap-1.5 text-destructive">
                      <Upload size={16} />
                      Restore database
                    </h3>
                    <p className="text-text-3 text-[11px] leading-normal">
                      Upload an existing `.sql` backup script file. This will overwrite all tables in the database.
                    </p>
                    <form onSubmit={handleRestore} className="space-y-3">
                      <input
                        type="file"
                        accept=".sql"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-text-3 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:bg-surface-2 file:text-text file:font-semibold hover:file:bg-primary-subtle/30"
                      />
                      <Button
                        type="submit"
                        disabled={restoreLoading || !uploadFile}
                        className="bg-destructive hover:bg-destructive/95 text-white font-bold rounded-lg w-full flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {restoreLoading ? "Restoring..." : "Restore Database"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Backups History Grid */}
              <Card className="lg:col-span-2 border-border shadow-sm">
                <CardContent className="p-4 md:p-6">
                  <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-4 flex items-center gap-1.5">
                    <Database size={18} className="text-primary" />
                    Backups History
                  </h3>
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="text-text-3 font-semibold">Backup File</TableHead>
                          <TableHead className="text-text-3 font-semibold">Size</TableHead>
                          <TableHead className="text-text-3 font-semibold">Created At</TableHead>
                          <TableHead className="text-text-3 font-semibold text-right pr-4">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backups.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-text-3">No backup files found.</TableCell>
                          </TableRow>
                        ) : (
                          backups.map((bak, idx) => (
                            <TableRow key={idx} className="border-border/60 hover:bg-surface-2/40">
                              <TableCell className="font-bold text-text font-mono">{bak.filename}</TableCell>
                              <TableCell className="font-mono text-text-2">{bak.size}</TableCell>
                              <TableCell className="font-mono text-text-3">{bak.time}</TableCell>
                              <TableCell className="text-right pr-4 font-semibold text-text-3 uppercase tracking-wider text-[10px]">
                                Manual
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
