"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout, initialize } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [showNoAccessModal, setShowNoAccessModal] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  const handleRoleChange = (role: string) => {
    if ((role === "admin" || role === "super-admin") && user?.role === "staff") {
      setShowNoAccessModal(true);
      return;
    }

    if (role === "customer") router.push("/customer");
    else if (role === "staff") router.push("/staff");
    else if (role === "admin") router.push("/admin");
    else if (role === "super-admin") router.push("/super-admin");
  };

  const handleGoToLogin = () => {
    setShowNoAccessModal(false);
    logout();
    router.push("/login");
  };

  const handleLogout = () => {
    logout();
    router.push("/customer");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md transition-colors">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo and Name */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/customer")}>
          <span className="text-2xl">🌿</span>
          <span className="font-display text-xl font-bold tracking-tight text-primary">
            Greeny Cafe
          </span>
        </div>

        {/* Development Role Switcher */}
        <nav className="hidden md:flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
          <button
            onClick={() => handleRoleChange("customer")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "customer"
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-primary-subtle/30"
            }`}
          >
            🛒 Order
          </button>
          <button
            onClick={() => handleRoleChange("staff")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "staff"
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-primary-subtle/30"
            }`}
          >
            👨‍🍳 Staff
          </button>
          <button
            onClick={() => handleRoleChange("admin")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "admin"
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-primary-subtle/30"
            }`}
          >
            📊 Admin
          </button>
          <button
            onClick={() => handleRoleChange("super-admin")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "super-admin"
                ? "bg-primary text-white shadow-sm"
                : "text-text-2 hover:text-text hover:bg-primary-subtle/30"
            }`}
          >
            ⚙️ Super Admin
          </button>
        </nav>

        {/* Right Section: Theme & Auth */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-text-2 hover:text-text hover:bg-surface-2"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          )}

          {/* User Info & Auth */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-text">{user.name}</span>
                <span className="text-[10px] text-text-3 capitalize">{user.role.replace("_", " ")}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 rounded-full"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </Button>
            </div>
          ) : (
            activeTab !== "customer" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/login")}
                className="text-xs font-semibold px-4 border-primary text-primary hover:bg-primary hover:text-white"
              >
                Sign In
              </Button>
            )
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer Switcher */}
      <div className="flex md:hidden border-t border-border bg-surface-2 justify-around p-1 text-xs">
        <button
          onClick={() => handleRoleChange("customer")}
          className={`flex-1 py-2 text-center font-medium ${
            activeTab === "customer" ? "text-primary font-bold" : "text-text-2"
          }`}
        >
          🛒 Order
        </button>
        <button
          onClick={() => handleRoleChange("staff")}
          className={`flex-1 py-2 text-center font-medium ${
            activeTab === "staff" ? "text-primary font-bold" : "text-text-2"
          }`}
        >
          👨‍🍳 Staff
        </button>
        <button
          onClick={() => handleRoleChange("admin")}
          className={`flex-1 py-2 text-center font-medium ${
            activeTab === "admin" ? "text-primary font-bold" : "text-text-2"
          }`}
        >
          📊 Admin
        </button>
        <button
          onClick={() => handleRoleChange("super-admin")}
          className={`flex-1 py-2 text-center font-medium ${
            activeTab === "super-admin" ? "text-primary font-bold" : "text-text-2"
          }`}
        >
          ⚙️ Super Admin
        </button>
      </div>

      {/* Access Control Dialog Modal */}
      <Dialog open={showNoAccessModal} onOpenChange={setShowNoAccessModal}>
        <DialogContent className="sm:max-w-[400px] border-border bg-surface/95 backdrop-blur-md shadow-2xl rounded-2xl p-6">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-full flex items-center justify-center border border-destructive/20 animate-pulse">
              <ShieldAlert size={28} />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-destructive">
              Access Denied
            </DialogTitle>
            <DialogDescription className="text-text-2 text-xs leading-normal">
              You do not have administrative privileges to access the Admin Panel. Please switch to an administrator account to view dashboard settings and analytics.
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
    </header>
  );
}
