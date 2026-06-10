"use client";

import { Order } from "@/types";
import { useOrderStore } from "@/store/useOrderStore";
import { Button } from "@/components/ui/button";
import { Check, Flame, Gift, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface OrderQueueCardProps {
  order: Order;
  isHistory?: boolean;
}

export default function OrderQueueCard({ order, isHistory = false }: OrderQueueCardProps) {
  const { updateOrderStatus, cancelOrder } = useOrderStore();
  const [loading, setLoading] = useState(false);

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleStatusChange = async (nextStatus: 'accepted' | 'preparing' | 'ready' | 'served') => {
    setLoading(true);
    try {
      await updateOrderStatus(order.id, nextStatus);
      toast.success(`Order moved to '${nextStatus}'`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to update order status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm(`Are you sure you want to cancel order ${order.order_number}?`)) {
      setLoading(true);
      try {
        await cancelOrder(order.id);
        toast.success("Order cancelled successfully.");
      } catch (err: unknown) {
        const error = err as Error;
        toast.error(error.message || "Failed to cancel order.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Get status details: color badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-blue-500 text-blue-50";
      case "accepted": return "bg-indigo-500 text-indigo-50";
      case "preparing": return "bg-amber-500 text-amber-950";
      case "ready": return "bg-green-500 text-green-50";
      case "served": return "bg-emerald-500 text-emerald-50";
      case "cancelled": return "bg-destructive text-white";
      default: return "bg-gray-500 text-gray-50";
    }
  };

  return (
    <div
      className={`bg-surface border border-border p-4 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md ${
        isHistory ? "opacity-60 grayscale-[10%]" : ""
      }`}
    >
      <div className="flex justify-between items-start gap-2 border-b border-border/60 pb-3 mb-3">
        <div className="flex flex-col">
          <span className="font-display font-extrabold text-primary text-base">
            {order.order_number}
          </span>
          <span className="text-[10px] text-text-3 font-semibold mt-0.5">
            {order.customer_name} {order.table_number ? `• Table ${order.table_number}` : ""}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusColor(order.status)}`}>
            ● {order.status}
          </span>
          <span className="text-[9px] text-text-3 mt-1 font-mono">{formatTime(order.created_at)}</span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-1.5 min-h-[50px] mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs text-text-2">
            <span>{item.quantity} × {item.item_name}</span>
            <span className="font-semibold text-text">₹{(Number(item.item_price) * Number(item.quantity)).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-2 text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-3">Total Amount</span>
          <span className="font-display font-bold text-primary text-sm">₹{order.total}</span>
        </div>

        {/* Action Buttons based on status */}
        {!isHistory && (
          <div className="flex items-center gap-1.5">
            {order.status === "pending" && (
              <Button
                size="sm"
                disabled={loading}
                onClick={() => handleStatusChange("accepted")}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[10px] px-3 h-8 shadow-sm"
              >
                <Check size={12} className="mr-1" />
                Accept
              </Button>
            )}

            {order.status === "accepted" && (
              <Button
                size="sm"
                disabled={loading}
                onClick={() => handleStatusChange("preparing")}
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-lg font-bold text-[10px] px-3 h-8 shadow-sm"
              >
                <Flame size={12} className="mr-1" />
                Prepare
              </Button>
            )}

            {order.status === "preparing" && (
              <Button
                size="sm"
                disabled={loading}
                onClick={() => handleStatusChange("ready")}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-[10px] px-3 h-8 shadow-sm"
              >
                <Check size={12} className="mr-1" />
                Ready
              </Button>
            )}

            {order.status === "ready" && (
              <Button
                size="sm"
                disabled={loading}
                onClick={() => handleStatusChange("served")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] px-3 h-8 shadow-sm"
              >
                <Gift size={12} className="mr-1" />
                Serve
              </Button>
            )}

            {/* Cancel Button */}
            {order.status !== "served" && order.status !== "cancelled" && (
              <Button
                size="icon"
                disabled={loading}
                onClick={handleCancel}
                variant="ghost"
                className="text-text-3 hover:text-destructive hover:bg-destructive/10 rounded-lg w-8 h-8"
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
