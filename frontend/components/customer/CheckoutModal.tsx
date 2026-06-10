"use client";

import { useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useOrderStore } from "@/store/useOrderStore";
import { Order } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export default function CheckoutModal({ isOpen, onClose, onSuccess }: CheckoutModalProps) {
  const { items, total, clearCart } = useCartStore();
  const { placeOrder, loading } = useOrderStore();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Customer name is required.");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }

    const orderData = {
      customer_name: customerName,
      customer_phone: customerPhone || undefined,
      table_number: tableNumber || undefined,
      notes: notes || undefined,
      payment_method: paymentMethod,
      items: items.map((i) => ({
        menu_item_id: i.id,
        quantity: i.qty,
      })),
    };

    try {
      const order = await placeOrder(orderData);
      toast.success("Order placed successfully!");
      clearCart();
      onSuccess(order);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to place order. Please try again.");
      toast.error(error.message || "Failed to place order.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-primary">
            Checkout Details
          </DialogTitle>
          <DialogDescription className="text-text-3">
            Please enter customer details to complete the order.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Customer Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-2">
              Customer Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="border-border text-sm focus-visible:ring-primary rounded-lg"
            />
          </div>

          {/* Customer Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-2">
              Phone Number (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. +919876543210"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="border-border text-sm focus-visible:ring-primary rounded-lg"
            />
          </div>

          {/* Table Number & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-2">
                Table Number (Opt.)
              </label>
              <Input
                type="text"
                placeholder="e.g. Table 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="border-border text-sm focus-visible:ring-primary rounded-lg"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'upi' | 'card')}
                className="flex h-9 w-full rounded-lg border border-input bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="cash">💵 Cash</option>
                <option value="upi">📱 UPI</option>
                <option value="card">💳 Card</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-text-2">
              Special Instructions
            </label>
            <textarea
              placeholder="Any comments (e.g. extra spicy, sugar-free)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[60px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm placeholder:text-text-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Summary */}
          <div className="bg-surface-2 p-3 rounded-lg border border-border text-xs space-y-1.5 font-sans">
            <div className="font-semibold text-text mb-1">Order Summary:</div>
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-text-2">
                <span>{i.qty} x {i.name}</span>
                <span>₹{(Number(i.price) * Number(i.qty)).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1.5 flex justify-between font-bold text-text mt-1 text-sm">
              <span>Total Amount (incl. Tax)</span>
              <span className="font-display font-extrabold text-primary">₹{Number(total).toFixed(2)}</span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-destructive text-center">
              {errorMsg}
            </p>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/95 text-white rounded-lg flex-1 font-bold shadow-md"
            >
              {loading ? "Placing Order..." : "Confirm & Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
