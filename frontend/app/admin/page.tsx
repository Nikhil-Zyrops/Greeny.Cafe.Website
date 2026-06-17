"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { MenuItem, Ingredient, Order, FoodType } from "@/types";
import Topbar from "@/components/common/Topbar";
import Sidebar from "@/components/common/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import RevenueCalendar from "@/components/admin/RevenueCalendar";
import { WeeklyRevenueChart, PeakHoursChart, TopSellingItemsChart } from "@/components/admin/AnalyticsChart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  LayoutDashboard, Coffee, Package, ShoppingCart, BarChart3, Calendar, Plus, 
  Trash2, Edit, Check, AlertTriangle, TrendingUp, DollarSign, Clock, Users 
} from "lucide-react";

interface WeeklyData {
  day: string;
  revenue: number;
}

interface PeakHourData {
  hour: string;
  count: number;
}

interface TopItemData {
  name: string;
  emoji: string;
  total_quantity: number;
  total_revenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { initialize } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<"dashboard" | "menu" | "inventory" | "orders" | "analytics" | "calendar">("dashboard");
  const [loading, setLoading] = useState(true);

  // Stats summary state
  const [summary, setSummary] = useState({
    today_revenue: 0,
    weekly_revenue: 0,
    monthly_revenue: 0,
    total_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    active_staff: 0,
    low_stock_count: 0,
    avg_order_value: 0.00,
    completion_rate: 100.0,
    avg_completion_minutes: 12.5
  });

  // DB Lists
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topItems, setTopItems] = useState<TopItemData[]>([]);
  
  // Chart Lists
  const [weeklyRevenueData, setWeeklyRevenueData] = useState<WeeklyData[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<PeakHourData[]>([]);

  // Modals / Form States for Menu CRUD
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemEmoji, setItemEmoji] = useState("🌿");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemFoodType, setItemFoodType] = useState<FoodType>("veg");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState("100");

  // Orders Tab Filter state
  const [orderFilter, setOrderFilter] = useState("all");

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
      if (u.role !== "admin" && u.role !== "super_admin") {
        router.push("/customer");
        return;
      }
      setLoading(false);
    } catch {
      router.push("/login");
    }
  }, [initialize, router]);

  // Load all reports & tables
  const loadData = async () => {
    try {
      // 1. Stats Summary
      const summaryRes = await api.get("/analytics/summary");
      if (summaryRes.data.success) setSummary(summaryRes.data.data);

      // 2. Menu Items
      const menuRes = await api.get("/menu");
      if (menuRes.data.success) {
        setMenuItems(menuRes.data.data);
        // Extract unique categories
        const uniqCats = Array.from(
          new Set(
            menuRes.data.data.map((item: MenuItem) =>
              JSON.stringify({ id: item.category_id, name: item.category?.name || "Drinks" })
            )
          )
        ).map((s) => JSON.parse(s as string) as { id: number; name: string });
        setCategories(uniqCats);
      }

      // 3. Inventory Ingredients
      const invRes = await api.get("/inventory");
      if (invRes.data.success) setIngredients(invRes.data.data.ingredients);

      // 4. Orders History
      const ordRes = await api.get("/orders?status=all");
      if (ordRes.data.success) {
        setOrders(ordRes.data.data);
        setRecentOrders(ordRes.data.data.slice(0, 4));
      }

      // 5. Top Items Chart
      const topRes = await api.get("/analytics/top-items?limit=5");
      if (topRes.data.success) setTopItems(topRes.data.data);

      // 6. Charts
      const weeklyRes = await api.get("/analytics/weekly-revenue");
      if (weeklyRes.data.success) setWeeklyRevenueData(weeklyRes.data.data);

      const peakRes = await api.get("/analytics/peak-hours");
      if (peakRes.data.success) setPeakHoursData(peakRes.data.data);

    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  useEffect(() => {
    if (loading) return;
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="ml-2">Verifying admin credentials...</p>
      </div>
    );
  }

  // Handle Menu Item Save (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemPrice || !itemCategoryId) {
      toast.error("Please fill in required fields.");
      return;
    }

    const payload = {
      name: itemName,
      emoji: itemEmoji,
      description: itemDescription,
      category_id: parseInt(itemCategoryId),
      food_type: itemFoodType,
      price: parseFloat(itemPrice),
      stock_quantity: parseInt(itemStock),
    };

    try {
      if (editingItem) {
        // Update
        const res = await api.put(`/menu/${editingItem.id}`, payload);
        if (res.data.success) {
          toast.success("Menu item updated successfully!");
          loadData();
        }
      } else {
        // Create
        const res = await api.post("/menu", payload);
        if (res.data.success) {
          toast.success("Menu item created successfully!");
          loadData();
        }
      }
      setIsItemModalOpen(false);
      resetItemForm();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to save menu item.");
    }
  };

  const handleEditItemClick = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemEmoji(item.emoji);
    setItemDescription(item.description);
    setItemCategoryId(item.category_id.toString());
    setItemFoodType(item.food_type);
    setItemPrice(item.price.toString());
    setItemStock(item.stock_quantity.toString());
    setIsItemModalOpen(true);
  };

  const resetItemForm = () => {
    setEditingItem(null);
    setItemName("");
    setItemEmoji("🌿");
    setItemDescription("");
    setItemCategoryId(categories[0]?.id.toString() || "");
    setItemFoodType("veg");
    setItemPrice("");
    setItemStock("100");
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      try {
        const res = await api.delete(`/menu/${id}`);
        if (res.data.success) {
          toast.success("Menu item deleted successfully (soft deleted).");
          loadData();
        }
      } catch {
        toast.error("Failed to delete menu item.");
      }
    }
  };

  const handleToggleItemAvailability = async (id: number) => {
    try {
      const res = await api.patch(`/menu/${id}/toggle`);
      if (res.data.success) {
        toast.success("Availability updated.");
        loadData();
      }
    } catch {
      toast.error("Failed to toggle availability.");
    }
  };

  // Filter orders by status
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "all") return true;
    return o.status === orderFilter;
  });

  return (
    <div className="flex min-h-screen bg-bg transition-colors">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 overflow-x-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-[220px] shrink-0 space-y-3">
          <div className="flex flex-col gap-1 bg-surface border border-border p-2 rounded-2xl">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "dashboard" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "menu" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Coffee size={16} />
              Menu Management
            </button>
            <button
              onClick={() => { setActiveTab("inventory"); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "inventory" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Package size={16} />
              Inventory
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "orders" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <ShoppingCart size={16} />
              Orders History
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "analytics" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <BarChart3 size={16} />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-lg text-left transition-all ${
                activeTab === "calendar" ? "bg-primary text-white" : "text-text-2 hover:bg-surface-2 hover:text-text"
              }`}
            >
              <Calendar size={16} />
              Revenue Calendar
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
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
              {activeTab === "dashboard" && (
                <>
              {/* 8 Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <DollarSign size={18} className="text-primary mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Today&apos;s Revenue</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">₹{Number(summary.today_revenue).toFixed(0)}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <TrendingUp size={18} className="text-primary-light mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Weekly Revenue</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">₹{Number(summary.weekly_revenue).toFixed(0)}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <TrendingUp size={18} className="text-primary-light mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Monthly Revenue</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">₹{Number(summary.monthly_revenue).toFixed(0)}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <ShoppingCart size={18} className="text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Total Orders</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.total_orders}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Check size={18} className="text-emerald-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Served Orders</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.completed_orders}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Trash2 size={18} className="text-destructive mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Cancelled Orders</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.cancelled_orders}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Users size={18} className="text-indigo-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Active Staff</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.active_staff}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <AlertTriangle size={18} className="text-amber-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Low Stock Items</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.low_stock_count}</span>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* Recent Orders Table */}
                <Card className="lg:col-span-2 border-border shadow-sm">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-4">
                      Recent Orders
                    </h3>
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-text-3 font-semibold">Order ID</TableHead>
                            <TableHead className="text-text-3 font-semibold">Customer</TableHead>
                            <TableHead className="text-text-3 font-semibold">Amount</TableHead>
                            <TableHead className="text-text-3 font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-6 text-text-3">No orders found.</TableCell></TableRow>
                          ) : (
                            recentOrders.map((order) => (
                              <TableRow key={order.id} className="border-border/60 hover:bg-surface-2/40">
                                <TableCell className="font-bold text-primary font-mono">{order.order_number}</TableCell>
                                <TableCell className="font-semibold text-text">{order.customer_name}</TableCell>
                                <TableCell className="font-mono font-bold text-text">₹{order.total}</TableCell>
                                <TableCell>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                    order.status === 'served' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary-subtle text-primary'
                                  }`}>
                                    {order.status}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Selling Items Mini-Chart */}
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-display font-bold text-text text-base border-b border-border/60 pb-3 mb-4">
                      Top Selling Items
                    </h3>
                    {topItems.length === 0 ? (
                      <div className="text-center py-12 text-xs text-text-3">No sales records available.</div>
                    ) : (
                      <TopSellingItemsChart data={topItems} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ==========================================
              TAB: MENU MANAGEMENT
              ========================================== */}
          {activeTab === "menu" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-bold font-display text-text">Menu Item Records</h2>
                <Button 
                  onClick={() => { resetItemForm(); setIsItemModalOpen(true); }}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs flex items-center gap-1 h-8 shadow-sm"
                >
                  <Plus size={14} /> Add Item
                </Button>
              </div>

              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-12 text-text-3 text-center">Emoji</TableHead>
                        <TableHead className="text-text-3 font-semibold">Name</TableHead>
                        <TableHead className="text-text-3 font-semibold">Category</TableHead>
                        <TableHead className="text-text-3 font-semibold">Type</TableHead>
                        <TableHead className="text-text-3 font-semibold">Price</TableHead>
                        <TableHead className="text-text-3 font-semibold text-center">Available</TableHead>
                        <TableHead className="text-text-3 font-semibold text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuItems.map((item) => (
                        <TableRow key={item.id} className="border-border/60 hover:bg-surface-2/40">
                          <TableCell className="text-center text-lg">{item.emoji}</TableCell>
                          <TableCell className="font-bold text-text">{item.name}</TableCell>
                          <TableCell>
                            <span className="bg-primary/10 text-primary dark:text-primary-light text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                              {item.category?.name || "Drinks"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold ${
                              item.food_type === 'veg' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.food_type === 'veg' ? 'Veg' : 'Non-Veg'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-text">₹{Number(item.price).toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleToggleItemAvailability(item.id)}
                              className={`w-10 h-5 rounded-full border transition-all relative ${
                                item.is_available 
                                  ? "bg-primary border-primary flex justify-end" 
                                  : "bg-surface-2 border-border flex justify-start"
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full m-0.5 transition-all bg-white shadow ${
                                item.is_available ? "translate-x-0" : "translate-x-0"
                              }`} />
                            </button>
                          </TableCell>
                          <TableCell className="text-right pr-4 space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEditItemClick(item)}
                              className="h-7 w-7 text-text-2 hover:text-primary hover:bg-primary-subtle/30 rounded-lg"
                            >
                              <Edit size={12} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteItem(item.id)}
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

              {/* Add/Edit Modal */}
              <Dialog open={isItemModalOpen} onOpenChange={(open) => !open && setIsItemModalOpen(false)}>
                <DialogContent className="sm:max-w-[420px] border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display text-lg font-bold text-primary">
                      {editingItem ? "Edit Menu Item" : "Add Menu Item"}
                    </DialogTitle>
                    <DialogDescription className="text-text-3">
                      Fill in the item details to make it available in POS.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSaveItem} className="space-y-4 py-2">
                    <div className="grid grid-cols-4 gap-3 items-center">
                      <div className="col-span-3 space-y-1">
                        <label className="text-xs font-bold text-text-2">Item Name</label>
                        <Input
                          placeholder="e.g. Green Detox"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-xs font-bold text-text-2">Emoji</label>
                        <Input
                          placeholder="🥤"
                          value={itemEmoji}
                          onChange={(e) => setItemEmoji(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg text-center h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-text-2">Description</label>
                      <textarea
                        placeholder="Item description..."
                        value={itemDescription}
                        onChange={(e) => setItemDescription(e.target.value)}
                        className="flex min-h-[50px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-sm placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Category</label>
                        <select
                          value={itemCategoryId}
                          onChange={(e) => setItemCategoryId(e.target.value)}
                          className="flex h-9 w-full rounded-lg border border-input bg-surface px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Food Type</label>
                        <select
                          value={itemFoodType}
                          onChange={(e) => setItemFoodType(e.target.value as FoodType)}
                          className="flex h-9 w-full rounded-lg border border-input bg-surface px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="veg">🟢 Veg</option>
                          <option value="nonveg">🔴 Non-Veg</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Price (₹)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 120"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-text-2">Initial Stock</label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={itemStock}
                          onChange={(e) => setItemStock(e.target.value)}
                          required
                          className="border-border text-xs focus-visible:ring-primary rounded-lg h-9"
                        />
                      </div>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsItemModalOpen(false)}
                        className="border-border rounded-lg text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/95 text-white rounded-lg font-bold text-xs px-4"
                      >
                        Save Item
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ==========================================
              TAB: INVENTORY
              ========================================== */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {/* Inventory stat summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Total Ingredients</span>
                    <span className="text-xl font-display font-extrabold text-text block mt-1">
                      {ingredients.length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Low Stock Count</span>
                    <span className="text-xl font-display font-extrabold text-amber-500 block mt-1">
                      {ingredients.filter((i) => i.status === "Low Stock").length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Out of Stock Count</span>
                    <span className="text-xl font-display font-extrabold text-destructive block mt-1">
                      {ingredients.filter((i) => i.status === "Out of Stock").length}
                    </span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Total Value</span>
                    <span className="text-xl font-display font-extrabold text-primary block mt-1">
                      ₹{ingredients.reduce((sum, i) => sum + Number(i.current_stock) * Number(i.cost_per_unit), 0).toFixed(0)}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Ingredients Table */}
              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-text-3 font-semibold">Ingredient Name</TableHead>
                        <TableHead className="text-text-3 font-semibold">Stock Progress</TableHead>
                        <TableHead className="text-text-3 font-semibold">Min Stock</TableHead>
                        <TableHead className="text-text-3 font-semibold">Cost / Unit</TableHead>
                        <TableHead className="text-text-3 font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ing) => {
                        // Max stock reference for progress bar
                        const maxRef = Math.max(ing.current_stock, ing.minimum_stock * 2, 100);
                        const progressVal = (ing.current_stock / maxRef) * 100;

                        return (
                          <TableRow key={ing.id} className="border-border/60 hover:bg-surface-2/40">
                            <TableCell className="font-bold text-text">{ing.name}</TableCell>
                            <TableCell className="w-[30%]">
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={Math.max(2, Math.min(100, progressVal))} 
                                  className={`h-2 bg-border flex-1 [&>div]:${
                                    ing.status === 'Out of Stock' 
                                      ? 'bg-destructive' 
                                      : ing.status === 'Low Stock' 
                                      ? 'bg-amber-500' 
                                      : 'bg-primary'
                                  }`} 
                                />
                                <span className="font-mono text-[10px] text-text-2 shrink-0">
                                  {Number(ing.current_stock).toFixed(0)} {ing.unit}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-text-2">{Number(ing.minimum_stock)} {ing.unit}</TableCell>
                            <TableCell className="font-mono text-text-2">₹{Number(ing.cost_per_unit).toFixed(2)}</TableCell>
                            <TableCell>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                ing.status === 'Out of Stock' 
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                                  : ing.status === 'Low Stock' 
                                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                                  : 'bg-green-500/10 text-green-700 border border-green-500/20'
                              }`}>
                                {ing.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ==========================================
              TAB: ORDERS HISTORY
              ========================================== */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-lg font-bold font-display text-text">Customer Order History</h2>
                {/* Filter Selector */}
                <select
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">📁 All Statuses</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="accepted">✓ Accepted</option>
                  <option value="preparing">🍳 Preparing</option>
                  <option value="ready">✅ Ready</option>
                  <option value="served">🎉 Served</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
              </div>

              <Card className="border-border shadow-sm">
                <CardContent className="p-0">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-text-3 font-semibold">Order ID</TableHead>
                        <TableHead className="text-text-3 font-semibold">Customer</TableHead>
                        <TableHead className="text-text-3 font-semibold">Items Ordered</TableHead>
                        <TableHead className="text-text-3 font-semibold">Total Price</TableHead>
                        <TableHead className="text-text-3 font-semibold">Status</TableHead>
                        <TableHead className="text-text-3 font-semibold">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10 text-text-3">No orders found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="border-border/60 hover:bg-surface-2/40">
                            <TableCell className="font-bold text-primary font-mono">{order.order_number}</TableCell>
                            <TableCell className="font-semibold text-text">
                              {order.customer_name} {order.table_number ? `(Table ${order.table_number})` : ""}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-text-2 font-medium">
                              {order.items.map((i) => `${i.quantity}x ${i.item_name}`).join(", ")}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-text">₹{order.total}</TableCell>
                            <TableCell>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                order.status === 'served' 
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                  : order.status === 'cancelled' 
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                                  : 'bg-primary-subtle text-primary border border-primary-light/20'
                              }`}>
                                {order.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-text-3 font-mono">
                              {new Date(order.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </TableCell>
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
              TAB: ANALYTICS
              ========================================== */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Analytics KPI mini cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <TrendingUp size={20} className="text-primary mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Average Order Value</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">₹{summary.avg_order_value}</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Check size={20} className="text-emerald-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Order Completion %</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.completion_rate}%</span>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center">
                    <Clock size={20} className="text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider">Avg Completion Time</span>
                    <span className="text-xl font-display font-extrabold text-text mt-1">{summary.avg_completion_minutes} min</span>
                  </CardContent>
                </Card>
              </div>

              {/* Peak Hours & Weekly Revenue Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-display font-bold text-text text-sm border-b border-border/60 pb-3 mb-4">
                      Weekly Revenue Details
                    </h3>
                    {weeklyRevenueData.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-3">No sales records this week.</div>
                    ) : (
                      <WeeklyRevenueChart data={weeklyRevenueData} />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-display font-bold text-text text-sm border-b border-border/60 pb-3 mb-4">
                      Peak Ordering Hours
                    </h3>
                    {peakHoursData.length === 0 ? (
                      <div className="text-center py-10 text-xs text-text-3">No peak hour metrics available.</div>
                    ) : (
                      <PeakHoursChart data={peakHoursData} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

              {/* ==========================================
                  TAB: REVENUE CALENDAR
                  ========================================== */}
              {activeTab === "calendar" && <RevenueCalendar />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      </div>
    </div>
  );
}
