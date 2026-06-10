import { create } from 'zustand';
import { Order, OrderStatus } from '@/types';
import api from '@/lib/api';

interface CreateOrderDTO {
  customer_name: string;
  customer_phone?: string;
  table_number?: string;
  notes?: string;
  payment_method: 'cash' | 'upi' | 'card';
  items: { menu_item_id: number; quantity: number }[];
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: (status?: OrderStatus) => Promise<void>;
  updateOrderStatus: (id: number, status: OrderStatus) => Promise<void>;
  placeOrder: (data: CreateOrderDTO) => Promise<Order>;
  cancelOrder: (id: number) => Promise<void>;
  addOrderToQueue: (order: Order) => void;
  updateOrderInQueue: (order: Order) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  addOrderToQueue: (order: Order) => {
    const { orders } = get();
    // Prevent duplicates
    if (orders.some((o) => o.id === order.id)) return;
    set({ orders: [order, ...orders] });
  },

  updateOrderInQueue: (order: Order) => {
    const { orders } = get();
    // Replace order if exists, otherwise append (if active)
    const activeStatuses = ['pending', 'accepted', 'preparing', 'ready'];
    const exists = orders.some((o) => o.id === order.id);

    if (exists) {
      // If it's served or cancelled and we are looking at active queue, remove it
      if (!activeStatuses.includes(order.status)) {
        set({ orders: orders.filter((o) => o.id !== order.id) });
      } else {
        set({
          orders: orders.map((o) => (o.id === order.id ? order : o)),
        });
      }
    } else if (activeStatuses.includes(order.status)) {
      set({ orders: [order, ...orders] });
    }
  },

  fetchOrders: async (status?: OrderStatus) => {
    set({ loading: true, error: null });
    try {
      const url = status ? `/orders?status=${status}` : '/orders';
      const response = await api.get(url);
      const { success, data, message } = response.data;
      if (success) {
        set({ orders: data, loading: false });
      } else {
        set({ error: message || 'Failed to fetch orders', loading: false });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to fetch orders';
      set({ error: msg, loading: false });
    }
  },

  placeOrder: async (data: CreateOrderDTO) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/orders', data);
      const { success, data: order, message } = response.data;
      if (success) {
        set({ loading: false });
        return order as Order;
      } else {
        throw new Error(message || 'Failed to place order');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place order';
      set({ error: msg, loading: false });
      throw new Error(msg);
    }
  },

  updateOrderStatus: async (id: number, status: OrderStatus) => {
    set({ error: null });
    try {
      const response = await api.patch(`/orders/${id}/status`, { status });
      const { success, data: order, message } = response.data;
      if (success) {
        // Update order locally in state
        get().updateOrderInQueue(order);
      } else {
        throw new Error(message || 'Failed to update status');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update status';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  cancelOrder: async (id: number) => {
    set({ error: null });
    try {
      const response = await api.delete(`/orders/${id}`);
      const { success, data: order, message } = response.data;
      if (success) {
        get().updateOrderInQueue(order);
      } else {
        throw new Error(message || 'Failed to cancel order');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to cancel order';
      set({ error: msg });
      throw new Error(msg);
    }
  },
}));
