import { create } from 'zustand';
import { MenuItem, CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  taxRate: number; // default: 7.5%
  subtotal: number;
  tax: number;
  total: number;
  addItem: (item: MenuItem) => void;
  updateQty: (id: number, delta: number) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  setTaxRate: (rate: number) => void;
}

const calculateTotals = (items: CartItem[], taxRate: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round((subtotal * taxRate / 100) * 100) / 100;
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  taxRate: 7.5,
  subtotal: 0,
  tax: 0,
  total: 0,

  setTaxRate: (rate: number) => {
    set({ taxRate: rate });
    const { items } = get();
    set(calculateTotals(items, rate));
  },

  addItem: (item: MenuItem) => {
    const { items, taxRate } = get();
    const existing = items.find((i) => i.id === item.id);
    let newItems: CartItem[];

    if (existing) {
      newItems = items.map((i) =>
        i.id === item.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      newItems = [...items, { ...item, qty: 1 }];
    }

    set({ items: newItems });
    set(calculateTotals(newItems, taxRate));
  },

  updateQty: (id: number, delta: number) => {
    const { items, taxRate } = get();
    const newItems = items
      .map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
      .filter((i) => i.qty > 0);

    set({ items: newItems });
    set(calculateTotals(newItems, taxRate));
  },

  removeItem: (id: number) => {
    const { items, taxRate } = get();
    const newItems = items.filter((i) => i.id !== id);

    set({ items: newItems });
    set(calculateTotals(newItems, taxRate));
  },

  clearCart: () => {
    const { taxRate } = get();
    set({ items: [], subtotal: 0, tax: 0, total: 0 });
  },
}));
