"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ShoppingCart, ClipboardList, BarChart3, Settings, LogOut, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, initialize } = useAuthStore();
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);
  const [deniedTarget, setDeniedTarget] = useState("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  const activeTab = pathname.startsWith("/customer")
    ? "customer"
    : pathname.startsWith("/staff")
    ? "staff"
    : pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/super-admin")
    ? "super-admin"
    : "";

  const menuItems = [
    {
      key: "customer",
      label: "🛒 Place Order",
      path: "/customer",
      roleRequired: "customer",
      icon: ShoppingCart
    },
    {
      key: "staff",
      label: "👨‍🍳 Staff Queue",
      path: "/staff",
      roleRequired: "staff",
      icon: ClipboardList
    },
    {
      key: "admin",
      label: "📊 Manager Panel",
      path: "/admin",
      roleRequired: "admin",
      icon: BarChart3
    },
    {
      key: "super-admin",
      label: "⚙️ Super Admin",
      path: "/super-admin",
      roleRequired: "super_admin",
      icon: Settings
    }
  ];

  const hasAccess = (itemRole: string) => {
    if (!user) return itemRole === "customer" || itemRole === "staff";
    const userRole = user.role;
    if (userRole === "super_admin") return true;
    if (userRole === "admin") return itemRole !== "super_admin";
    if (userRole === "staff") return itemRole === "customer" || itemRole === "staff";
    if (userRole === "customer") return itemRole === "customer" || itemRole === "staff";
    return itemRole === "customer";
  };

  const handleNavigate = (path: string, roleRequired: string) => {
    if (!hasAccess(roleRequired)) {
      setDeniedTarget(roleRequired);
      setShowNoAccessModal(true);
      return;
    }
    router.push(path);
    onClose();
  };

  const handleGoToLogin = () => {
    setShowNoAccessModal(false);
    logout();
    router.push("/login");
  };

  const handleLogout = () => {
    logout();
    router.push("/customer");
    onClose();
  };

  const getDeniedMessage = () => {
    if (deniedTarget === "super-admin") {
      return "You do not have Super Admin privileges. Please sign in with a Super Admin account to access system settings, backups, and user audit logs.";
    }
    return "You do not have administrative privileges to access the Manager Panel. Please switch to an administrator account to view sales settings, menu editing, and dashboard analytics.";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-surface text-text-2 border-r border-border">
      {/* Logo & Name */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigate("/customer", "customer")}>
          <span className="text-2xl">🌿</span>
          <span className="font-display text-xl font-bold tracking-tight text-primary">
            Greeny Cafe
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 text-text-3 hover:text-text rounded-full hover:bg-surface-2 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isItemActive = activeTab === item.key;
          
          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.path, item.roleRequired)}
              className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                isItemActive
                  ? "bg-primary text-white shadow-md shadow-primary/10"
                  : "hover:bg-primary-subtle/20 hover:text-text text-text-2"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={isItemActive ? "text-white" : "text-text-3"} />
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-border bg-surface-2/40 space-y-3">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold font-display">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-text truncate">{user.name}</span>
                <span className="text-xs text-text-3 capitalize truncate">{user.role.replace("_", " ")}</span>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-center gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 rounded-xl py-2 text-xs"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => { router.push("/login"); onClose(); }}
            className="w-full bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-2.5 text-xs shadow-md"
          >
            Sign In
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Drawer overlay (Absolute overlay with Backdrop) */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-64 z-50 flex flex-col h-full shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Access Control Dialog Modal */}
      <Dialog open={showNoAccessModal} onOpenChange={setShowNoAccessModal}>
        <DialogContent className="sm:max-w-[400px] border-border bg-surface/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 z-50">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center border border-destructive/20 animate-pulse">
              <ShieldAlert size={28} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-destructive">
              Access Denied
            </DialogTitle>
            <DialogDescription className="text-text-2 text-xs leading-normal">
              {getDeniedMessage()}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNoAccessModal(false)}
              className="border-border hover:bg-surface-2 rounded-lg text-xs font-semibold"
            >
              Return
            </Button>
            <Button
              type="button"
              onClick={handleGoToLogin}
              className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs flex-1 shadow-md"
            >
              Sign In to Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
