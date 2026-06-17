"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useOrderStore } from "@/store/useOrderStore";
import api from "@/lib/api";
import Topbar from "@/components/common/Topbar";
import Sidebar from "@/components/common/Sidebar";
import OrderQueueCard from "@/components/staff/OrderQueueCard";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";

import { ClipboardList, TrendingUp, ShieldAlert, Award, Star, Clock } from "lucide-react";

export default function StaffDashboard() {
  const router = useRouter();
  const { user, initialize } = useAuthStore();
  const { orders, fetchOrders } = useOrderStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"queue" | "performance">("queue");
  const [loading, setLoading] = useState(true);
  const [perfData, setPerfData] = useState({
    completed: 0,
    cancelled: 0,
    avg_completion_minutes: 12.0,
    efficiency_score: 90.0,
    customer_rating: 4.8
  });

  // Verify auth
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
      if (u.role === "customer") {
        router.push("/customer");
        return;
      }
      setLoading(false);
    } catch {
      router.push("/login");
    }
  }, [initialize, router]);

  // Fetch orders and performance
  useEffect(() => {
    if (loading) return;

    const loadData = async () => {
      try {
        // Fetch active queue
        await fetchOrders();

        // Fetch staff performance
        const res = await api.get("/staff/performance");
        if (res.data.success) {
          setPerfData(res.data.data);
        }
      } catch (err) {
        console.error("Error loading staff data:", err);
      }
    };

    loadData();

    // Auto-refresh queue every 15 seconds as a socket fallback
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loading, fetchOrders]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="ml-2">Verifying staff credentials...</p>
      </div>
    );
  }

  // Active queue filter
  const activeOrders = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status));
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");


  // Fetch all served/cancelled today (mocking served orders for history)
  const completedToday = orders.filter((o) => o.status === "served");
  const historyOrders = orders.filter((o) => ["served", "cancelled"].includes(o.status));

  return (
    <div className="flex min-h-screen bg-bg transition-colors">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 overflow-x-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-[220px] shrink-0 space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-xl text-primary font-display font-black mb-2">
                {user?.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-bold text-text text-sm leading-tight">{user?.name}</h3>
              <span className="text-[10px] text-text-3 font-semibold uppercase tracking-wider mt-0.5 capitalize">
                {user?.role.replace("_", " ")}
              </span>
              
              <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-3 py-1 rounded-full mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-ping"></span>
                On Duty
              </div>
            </CardContent>
          </Card>

          {/* Tab buttons */}
          <div className="flex flex-col gap-1.5 bg-surface border border-border p-2 rounded-2xl">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "queue"
                  ? "bg-primary text-white"
                  : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <ClipboardList size={16} />
              Order Queue ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("performance")}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "performance"
                  ? "bg-primary text-white"
                  : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <TrendingUp size={16} />
              My Performance
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "queue" ? (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
              {/* Order Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Active Queue</div>
                    <div className="text-2xl font-black font-display text-primary mt-1">{activeOrders.length}</div>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Pending Acceptance</div>
                    <div className="text-2xl font-black font-display text-blue-600 mt-1">{pendingOrders.length}</div>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Currently Preparing</div>
                    <div className="text-2xl font-black font-display text-amber-500 mt-1">{preparingOrders.length}</div>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Served Today</div>
                    <div className="text-2xl font-black font-display text-emerald-600 mt-1">{completedToday.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Queue List */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold font-display text-text px-1"> Active Order Queue</h2>
                
                {activeOrders.length === 0 ? (
                  <div className="text-center py-20 bg-surface border border-border rounded-2xl">
                    <div className="text-5xl mb-3">🛌</div>
                    <h3 className="font-bold text-text mb-1">Queue is clear!</h3>
                    <p className="text-xs text-text-3 max-w-sm mx-auto">
                      There are no active orders right now. Take a breath or prepare prep ingredients!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeOrders.map((order) => (
                      <OrderQueueCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </div>

              {/* Served/Cancelled History below */}
              {historyOrders.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-border">
                  <h2 className="text-lg font-bold font-display text-text-2 px-1">Recently Resolved Orders</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {historyOrders.map((order) => (
                      <OrderQueueCard key={order.id} order={order} isHistory={true} />
                    ))}
                  </div>
                </div>
              )}
              </motion.div>
            ) : (
              /* Performance Tab content */
              <motion.div
                key="performance"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
              {/* Performance Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Award size={20} className="text-primary mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Orders Completed</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{perfData.completed}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ShieldAlert size={20} className="text-destructive mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Orders Cancelled</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{perfData.cancelled}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <TrendingUp size={20} className="text-primary-light mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Efficiency Score</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{perfData.efficiency_score}%</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Clock size={20} className="text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Avg prep time</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{perfData.avg_completion_minutes} min</span>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Detail */}
              <Card className="border-border shadow-md">
                <CardContent className="p-6 space-y-6">
                  <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-4">
                    Shift Performance Summary
                  </h3>

                  <div className="space-y-4 font-sans text-xs">
                    {/* Completion rate progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-text-2">
                        <span>Completion Target (Goal: 10 orders)</span>
                        <span className="text-primary">{perfData.completed} / 10</span>
                      </div>
                      <Progress value={Math.min(100, (perfData.completed / 10) * 100)} className="h-2 bg-border [&>div]:bg-primary" />
                    </div>

                    {/* Avg completion time progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-text-2">
                        <span>Speed Index (Optimal: 15 min or less)</span>
                        <span className="text-blue-600">{perfData.avg_completion_minutes} min</span>
                      </div>
                      <Progress 
                        value={Math.max(10, Math.min(100, 100 - (perfData.avg_completion_minutes > 15 ? (perfData.avg_completion_minutes - 15) * 5 : 0)))} 
                        className="h-2 bg-border [&>div]:bg-blue-500" 
                      />
                    </div>

                    {/* Efficiency score progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-text-2">
                        <span>Operational Efficiency</span>
                        <span className="text-amber-500">{perfData.efficiency_score}%</span>
                      </div>
                      <Progress value={perfData.efficiency_score} className="h-2 bg-border [&>div]:bg-amber-500" />
                    </div>

                    {/* Rating progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold text-text-2">
                        <span>Customer Satisfaction Rating</span>
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <Star size={12} className="fill-emerald-600" /> {perfData.customer_rating} / 5.0
                        </span>
                      </div>
                      <Progress value={(perfData.customer_rating / 5.0) * 100} className="h-2 bg-border [&>div]:bg-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      </div>
    </div>
  );
}
