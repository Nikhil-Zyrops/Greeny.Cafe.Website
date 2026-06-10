"use client";

import { MenuItem } from "@/types";
import { useCartStore } from "@/store/useCartStore";
import { Plus } from "lucide-react";

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  const { items, addItem } = useCartStore();
  const cartItem = items.find((i) => i.id === item.id);
  const quantity = cartItem ? cartItem.qty : 0;

  return (
    <div
      className={`group relative flex flex-col bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 ${
        !item.is_available ? "opacity-60 grayscale-[40%]" : ""
      }`}
    >
      {/* Visual Display Area */}
      <div className="relative h-[120px] w-full flex items-center justify-center bg-surface-2 transition-colors overflow-hidden">
        {/* Veg/Non-Veg Indicator (Top Left) */}
        <div className="absolute top-3 left-3 z-10 flex items-center justify-center bg-white dark:bg-surface p-1 rounded-md shadow-sm border border-border">
          <div
            className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${
              item.food_type === "veg"
                ? "border-green-600"
                : "border-red-600"
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                item.food_type === "veg" ? "bg-green-600" : "bg-red-600"
              }`}
            />
          </div>
        </div>

        {/* Out of Stock Badge (Top Right) */}
        {!item.is_available && (
          <div className="absolute top-3 right-3 z-10 bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            Sold Out
          </div>
        )}

        {/* Emojis as fallback, styled beautifully */}
        <div className="text-5xl transition-transform group-hover:scale-110 duration-300">
          {item.emoji}
        </div>

        {/* Image overlay with fallback */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Description & Detail */}
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-display font-bold text-text text-base leading-tight group-hover:text-primary transition-colors">
            {item.name}
          </h3>
          {item.is_popular && (
            <span className="shrink-0 bg-primary-subtle text-primary dark:text-primary-light text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
              Popular
            </span>
          )}
        </div>
        
        <p className="text-xs text-text-3 line-clamp-2 mb-3 flex-1">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          {/* Price (Fraunces Font) */}
          <span className="font-display font-extrabold text-primary text-lg">
            ₹{item.price}
          </span>

          {/* Circular Add Button */}
          <button
            onClick={() => item.is_available && addItem(item)}
            disabled={!item.is_available}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all border ${
              !item.is_available
                ? "bg-surface-2 border-border text-text-3 cursor-not-allowed"
                : "bg-primary text-white border-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-sm"
            }`}
          >
            <Plus size={16} />
            
            {/* Quantity Badge */}
            {quantity > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-light text-[9px] font-bold text-white border border-white dark:border-surface">
                {quantity}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
