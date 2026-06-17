"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, LogOut, Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout, initialize } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  const handleLogout = () => {
    logout();
    router.push("/customer");
  };

  const getPageTitle = () => {
    if (pathname.startsWith("/customer")) return "Menu Catalog";
    if (pathname.startsWith("/staff")) return "Kitchen & Orders Queue";
    if (pathname.startsWith("/admin")) return "Manager Analytics Dashboard";
    if (pathname.startsWith("/super-admin")) return "Super Admin Configuration";
    return "";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md transition-colors">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* Left: Mobile Menu Trigger & Logo */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-text-2 hover:bg-surface-2 rounded-full"
          >
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-2 cursor-pointer animate-fade-in" onClick={() => router.push("/customer")}>
            <span className="text-2xl">🌿</span>
            <span className="font-display text-lg font-bold tracking-tight text-primary">
              Greeny Cafe
            </span>
          </div>
        </div>

        {/* Middle: Page Title / Breadcrumb (visible on desktop) */}
        <div className="hidden md:block">
          <span className="text-sm font-semibold text-text-3 font-display">
            {getPageTitle()}
          </span>
        </div>

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/login")}
              className="text-xs font-semibold px-4 border-primary text-primary hover:bg-primary hover:text-white"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
