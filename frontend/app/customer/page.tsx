"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { MenuItem, Order, OrderStatus } from "@/types";
import { useCartStore } from "@/store/useCartStore";
import Topbar from "@/components/common/Topbar";
import Sidebar from "@/components/common/Sidebar";
import MenuCard from "@/components/customer/MenuCard";
import CheckoutModal from "@/components/customer/CheckoutModal";
import SuccessModal from "@/components/customer/SuccessModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ShoppingCart, Trash2, Plus, Minus, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerPage() {
  const { items, subtotal, tax, total, updateQty, removeItem, clearCart, setTaxRate } = useCartStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Component States
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("+917907937153");
  
  // Search, Filter & Sort States
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "drinks" | "snacks">("all");
  const [foodType, setFoodType] = useState<"all" | "veg" | "nonveg">("all");
  const [availability, setAvailability] = useState<"all" | "available" | "out_of_stock">("all");
  const [sort, setSort] = useState("popularity");

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Order Tracking State
  const [trackNumber, setTrackNumber] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load Menu and settings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load Menu
        const menuRes = await api.get("/menu");
        if (menuRes.data.success) {
          setMenuItems(menuRes.data.data);
        }

        // Load Settings (whatsapp_number & tax rate)
        const settingsRes = await api.get("/super/settings");
        if (settingsRes.data.success) {
          const settings = settingsRes.data.data;
          if (settings.whatsapp_number) setWhatsappNumber(settings.whatsapp_number);
          if (settings.tax_percentage) {
            const taxPct = parseFloat(settings.tax_percentage);
            setTaxRate(taxPct);
          }
        }
      } catch (err) {
        console.error("Error loading customer data:", err);
        toast.error("Could not load menu items. Please check if backend is running.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [setTaxRate]);

  // Handle Order Tracking
  const handleTrack = async () => {
    if (!trackNumber.trim()) {
      toast.error("Please enter a valid order number.");
      return;
    }

    try {
      setTrackingLoading(true);
      setTrackedOrder(null);
      const res = await api.get(`/orders/${trackNumber.trim()}/track`);
      if (res.data.success) {
        setTrackedOrder(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Order not found.");
    } finally {
      setTrackingLoading(false);
    }
  };

  // Auto-refresh tracked order status every 5 seconds until served or cancelled
  useEffect(() => {
    if (!trackedOrder || trackedOrder.status === "served" || trackedOrder.status === "cancelled") return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/orders/${trackedOrder.order_number}/track`);
        if (res.data.success) {
          setTrackedOrder(res.data.data);
        }
      } catch (err) {
        console.error("Error auto-updating tracked order status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [trackedOrder]);

  // Filter & Sort Logic (Frontend side to be fast)
  const filteredItems = menuItems
    .filter((item) => {
      // 1. Search filter
      if (debouncedSearch) {
        const term = debouncedSearch.toLowerCase();
        return item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term);
      }
      return true;
    })
    .filter((item) => {
      // 2. Category filter
      if (category === "all") return true;
      return item.category?.slug === category;
    })
    .filter((item) => {
      // 3. Food type filter
      if (foodType === "all") return true;
      return item.food_type === foodType;
    })
    .filter((item) => {
      // 4. Availability filter
      if (availability === "all") return true;
      if (availability === "available") return item.is_available;
      return !item.is_available;
    })
    .sort((a, b) => {
      // 5. Sort dropdown
      switch (sort) {
        case "popularity":
          // popular items first, then by name
          if (a.is_popular && !b.is_popular) return -1;
          if (!a.is_popular && b.is_popular) return 1;
          return a.name.localeCompare(b.name);
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "name_asc":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  // Track status stages
  const statusStages: { label: string; key: OrderStatus }[] = [
    { label: "Pending", key: "pending" },
    { label: "Accepted", key: "accepted" },
    { label: "Preparing", key: "preparing" },
    { label: "Ready", key: "ready" },
    { label: "Served", key: "served" },
  ];

  const getStatusIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    return statusStages.findIndex((s) => s.key === status);
  };

  return (
    <div className="flex min-h-screen bg-bg transition-colors">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 overflow-x-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Menu Items */}
        <div className="flex-1 space-y-6">
          {/* Header & Filter Controls Card */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
                  <Input
                    placeholder="Search fresh drinks or delicious food..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-border text-sm rounded-lg focus-visible:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <span className="text-xs font-semibold text-text-3">Sort by:</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="popularity">🌟 Popularity</option>
                    <option value="price_asc">💵 Price: Low to High</option>
                    <option value="price_desc">📈 Price: High to Low</option>
                    <option value="name_asc">🔤 Name: A to Z</option>
                    <option value="name_desc">🔤 Name: Z to A</option>
                  </select>
                </div>
              </div>

              {/* Filtering tags */}
              <div className="flex flex-col gap-3 pt-2 text-xs border-t border-border/60">
                {/* Category tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text-2 w-16">Category:</span>
                  {(["all", "drinks", "snacks"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-full border capitalize ${
                        category === cat
                          ? "bg-primary text-white border-primary"
                          : "border-border text-text-2 hover:bg-primary-subtle/25"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Food Type tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text-2 w-16">Type:</span>
                  {(["all", "veg", "nonveg"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFoodType(type)}
                      className={`px-3 py-1 rounded-full border capitalize ${
                        foodType === type
                          ? "bg-primary text-white border-primary"
                          : "border-border text-text-2 hover:bg-primary-subtle/25"
                      }`}
                    >
                      {type === "nonveg" ? "Non-Veg" : type}
                    </button>
                  ))}
                </div>

                {/* Availability tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text-2 w-16">Stock:</span>
                  {(["all", "available", "out_of_stock"] as const).map((avail) => (
                    <button
                      key={avail}
                      onClick={() => setAvailability(avail)}
                      className={`px-3 py-1 rounded-full border capitalize ${
                        availability === avail
                          ? "bg-primary text-white border-primary"
                          : "border-border text-text-2 hover:bg-primary-subtle/25"
                      }`}
                    >
                      {avail.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xl font-bold font-display text-text">
                {category === "all" ? "Our Complete Menu" : category === "drinks" ? "Refreshing Drinks" : "Hot Snacks"}
              </h2>
              <span className="text-xs text-text-3 font-medium">
                Showing {filteredItems.length} items
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p>Loading Greeny Cafe Menu...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-surface border border-border rounded-2xl">
                <div className="text-5xl mb-3">🔍</div>
                <h3 className="font-bold text-text mb-1">No items found</h3>
                <p className="text-xs text-text-3 max-w-sm mx-auto">
                  We couldn&apos;t find anything matching your filters. Try selecting &quot;All&quot; or altering search terms.
                </p>
              </div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <MenuCard item={item} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Order Tracker Stepper at bottom */}
          <Card className="border-border border-dashed bg-surface-2/65 shadow-sm">
            <CardContent className="p-4 md:p-6 space-y-4">
              <h3 className="font-display font-bold text-text text-base">🌿 Live Order Tracker</h3>
              <p className="text-xs text-text-2">
                Already placed an order? Enter your sequential order number to track its live status.
              </p>
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="e.g. GC-2026-000123"
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  className="border-border text-sm focus-visible:ring-primary rounded-lg"
                />
                <Button 
                  onClick={handleTrack} 
                  disabled={trackingLoading}
                  className="bg-primary hover:bg-primary/95 text-white font-bold rounded-lg shrink-0 px-5"
                >
                  {trackingLoading ? "Tracking..." : "Track"}
                </Button>
              </div>

              {/* Order Status Stepper */}
              {trackedOrder && (
                <div className="pt-4 border-t border-border/60 animate-fadeIn space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-3">
                      Order: <strong className="text-text">{trackedOrder.order_number}</strong> ({trackedOrder.customer_name})
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      trackedOrder.status === 'cancelled'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary-subtle text-primary'
                    }`}>
                      {trackedOrder.status}
                    </span>
                  </div>

                  {trackedOrder.status === 'cancelled' ? (
                    <div className="bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-lg flex items-center gap-2">
                      <span>⚠️</span> This order has been cancelled by the administrator.
                    </div>
                  ) : (
                    <div className="relative flex justify-between items-center py-2 max-w-lg mx-auto">
                      {/* Stepper line */}
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10" />
                      <div 
                        className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 -z-10 transition-all duration-500" 
                        style={{
                          width: `${(getStatusIndex(trackedOrder.status) / (statusStages.length - 1)) * 100}%`
                        }}
                      />

                      {statusStages.map((stage, idx) => {
                        const currentIdx = getStatusIndex(trackedOrder.status);
                        const isCompleted = idx < currentIdx;
                        const isActive = idx === currentIdx;
                        
                        return (
                          <div key={stage.key} className="flex flex-col items-center gap-1.5 bg-bg px-1">
                            <div 
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border ${
                                isCompleted 
                                  ? "bg-primary text-white border-primary" 
                                  : isActive 
                                  ? "bg-white border-primary-light text-primary ring-2 ring-primary-subtle font-black scale-110" 
                                  : "bg-white border-border text-text-3"
                              }`}
                            >
                              {isCompleted ? <Check size={12} /> : idx + 1}
                            </div>
                            <span className={`text-[9px] font-bold ${
                              isCompleted || isActive ? "text-primary" : "text-text-3"
                            }`}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Cart Panel */}
        <div className="w-full lg:w-[340px] shrink-0 lg:sticky lg:top-[88px] h-fit">
          <Card className="border-border shadow-md">
            <CardContent className="p-4 md:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-display font-bold text-text text-lg">
                  <ShoppingCart size={20} className="text-primary" />
                  Cart
                </div>
                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {items.reduce((sum, i) => sum + i.qty, 0)} Items
                </span>
              </div>

              {/* Cart List */}
              {items.length === 0 ? (
                <div className="text-center py-12 text-text-3 space-y-2">
                  <div className="text-4xl">🛒</div>
                  <div className="font-semibold text-sm">Your cart is empty</div>
                  <p className="text-[10px] text-text-3 max-w-[200px] mx-auto">
                    Add delicious drinks and snacks to start checking out!
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg bg-surface-2 p-1.5 rounded-lg border border-border">{item.emoji}</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-text leading-tight">{item.name}</span>
                              <span className="text-[10px] text-text-3">₹{Number(item.price).toFixed(2)} each</span>
                            </div>
                          </div>
                          {/* Qty Controls */}
                          <div className="flex items-center gap-1.5 bg-surface-2 px-2 py-1 rounded-lg border border-border">
                            <button 
                              onClick={() => updateQty(item.id, -1)}
                              className="text-text-3 hover:text-text cursor-pointer"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="font-bold font-mono text-[10px] text-text w-4 text-center">{item.qty}</span>
                            <button 
                              onClick={() => updateQty(item.id, 1)}
                              className="text-text-3 hover:text-text cursor-pointer"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                          {/* Remove */}
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-text-3 hover:text-destructive p-1 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2 text-xs font-sans">
                    <div className="flex justify-between text-text-2">
                      <span>Subtotal</span>
                      <span>₹{Number(subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-text-2">
                      <span>GST (7.5%)</span>
                      <span>₹{Number(tax).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-text pt-2 border-t border-border">
                      <span>Total Amount</span>
                      <span className="font-display font-extrabold text-primary text-base">₹{Number(total).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={clearCart}
                      className="border-border text-text-3 hover:text-destructive hover:bg-destructive/5 rounded-lg w-12"
                    >
                      <Trash2 size={16} />
                    </Button>
                    <Button 
                      onClick={() => setIsCheckoutOpen(true)}
                      className="bg-primary hover:bg-primary/95 text-white font-bold flex-1 rounded-lg flex items-center justify-center gap-1.5 shadow-md"
                    >
                      Place Order
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      </main>
      </div>

      {/* Modals */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={(order) => {
          setIsCheckoutOpen(false);
          setPlacedOrder(order);
          setIsSuccessOpen(true);
        }}
      />

      <SuccessModal
        order={placedOrder}
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
