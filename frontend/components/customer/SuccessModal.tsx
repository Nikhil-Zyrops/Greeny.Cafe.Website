"use client";

import { useState } from "react";
import { Order } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface SuccessModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string; // read from settings
}

export default function SuccessModal({ order, isOpen, onClose, whatsappNumber }: SuccessModalProps) {
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  if (!order) return null;

  // Extract Token Number from Order ID sequence
  // e.g. GC-2026-000123 -> 123
  const tokenNumber = order.order_number.split("-").pop() || "000";

  const handlePrint = () => {
    const printContent = document.getElementById("print-receipt-modal");
    if (!printContent) return;

    // Create a new hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page {
              size: A6;
              margin: 0; /* hides browser headers/footers (title, date, URL, page numbers) */
            }
            body {
              margin: 0;
              padding: 8mm; /* custom margin for content readability */
              background: #fff !important;
              color: #000 !important;
              font-family: monospace;
            }
            #print-receipt-modal {
              background: #fff !important;
              color: #000 !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
            #print-receipt-modal * {
              color: #000 !important;
              background: transparent !important;
              border-color: #000 !important;
              box-shadow: none !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; margin: 0 auto;">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Copy all style sheets from parent document to iframe
    const styleSheets = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleSheets.forEach((sheet) => {
      iframe.contentWindow?.document.head.appendChild(sheet.cloneNode(true));
    });

    // Wait short delay for assets/fonts, then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Print error:", e);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 500);
  };

  const handleWhatsAppSendDirect = async () => {
    try {
      setSendingWhatsapp(true);
      const res = await api.post(`/orders/${order.id}/whatsapp`);
      if (res.data.success) {
        if (res.data.sent_real) {
          toast.success(`WhatsApp message sent directly to ${res.data.recipient}!`);
        } else {
          toast.info(res.data.message || "Simulated WhatsApp message sent!");
        }
      } else {
        toast.error(res.data.message || "Failed to send WhatsApp message.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not send WhatsApp message. Please check backend.");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] border-border max-h-[95vh] overflow-y-auto">
        <DialogHeader className="no-print">
          <div className="flex justify-center text-4xl mb-2 animate-bounce">🎉</div>
          <DialogTitle className="font-display text-2xl font-bold text-center text-primary">
            Order Placed!
          </DialogTitle>
          <DialogDescription className="text-center text-text-3">
            Your order has been recorded successfully.
          </DialogDescription>
        </DialogHeader>

        {/* Thermal Receipt Print Area */}
        <div 
          id="print-receipt-modal" 
          className="border border-dashed border-border dark:border-border/30 bg-surface-2 dark:bg-surface p-6 rounded-lg text-center font-mono text-xs text-text transition-colors shadow-inner"
        >
          <div className="text-base font-extrabold tracking-tight text-primary font-display mb-1">🌿 GREENY CAFE</div>
          <div className="text-[10px] text-text-3 mb-4">Pure Nature. Pure Taste.</div>
          
          <div className="border-t border-b border-dashed border-border py-2 my-2 flex flex-col gap-1 items-start text-[10px] text-text-2">
            <div><strong>Order No:</strong> {order.order_number}</div>
            <div><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</div>
            <div><strong>Customer:</strong> {order.customer_name}</div>
            {order.customer_phone && <div><strong>Phone:</strong> {order.customer_phone}</div>}
            {order.table_number && <div><strong>Table:</strong> {order.table_number}</div>}
            <div><strong>Payment Method:</strong> <span className="uppercase font-bold">{order.payment_method || 'CASH'}</span></div>
          </div>

          {/* Token Display */}
          <div className="bg-primary/10 border border-primary-light/20 p-3 rounded-lg my-3 text-center">
            <div className="text-[10px] font-bold text-primary tracking-wider uppercase mb-0.5">TOKEN NUMBER</div>
            <div className="text-3xl font-display font-black text-primary">#{tokenNumber}</div>
          </div>

          <div className="text-left font-bold text-[10px] text-text-2 mb-1.5 uppercase tracking-wide">Ordered Items:</div>
          <div className="border-b border-dashed border-border pb-2 space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <span className="text-text">{item.quantity} x {item.item_name}</span>
                <span className="text-text-2 font-semibold">₹{(Number(item.item_price) * Number(item.quantity)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="pt-3 space-y-1.5 text-xs text-right border-b border-dashed border-border pb-3">
            <div className="flex justify-between">
              <span className="text-text-3">Subtotal</span>
              <span className="text-text-2">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-3">GST (7.5%)</span>
              <span className="text-text-2">₹{order.tax}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-text pt-1">
              <span>Grand Total</span>
              <span className="text-primary font-display">₹{order.total}</span>
            </div>
          </div>

          <div className="text-[9px] text-text-3 mt-4 text-center leading-relaxed italic">
            Thank you for dining with us!<br />
            Have a Greeny day! 🌿
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 no-print">
          <Button
            type="button"
            onClick={handleWhatsAppSendDirect}
            disabled={sendingWhatsapp}
            className="bg-[#25D366] hover:bg-[#20BA5A] disabled:bg-[#25D366]/60 text-white rounded-lg flex items-center justify-center gap-2 font-bold shadow-sm cursor-pointer"
          >
            {sendingWhatsapp ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Share2 size={16} />
                Send WhatsApp
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/95 text-white rounded-lg flex items-center justify-center gap-2 font-bold shadow-sm"
          >
            <Printer size={16} />
            Print Receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border rounded-lg"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
