// types/index.ts

export type UserRole = 'customer' | 'staff' | 'admin' | 'super_admin'
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled'
export type FoodType = 'veg' | 'nonveg'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  phone?: string
  status: 'active' | 'suspended' | 'on_leave'
}

export interface MenuItem {
  id: number
  name: string
  slug: string
  description: string
  category: {
    id: number
    name: string
    slug: string
  }
  category_id: number
  food_type: FoodType
  price: number
  emoji: string
  image_url?: string
  is_available: boolean
  is_popular: boolean
  stock_quantity: number
}

export interface CartItem extends MenuItem {
  qty: number
}

export interface OrderItem {
  id: number
  menu_item_id: number
  item_name: string
  item_price: number
  quantity: number
  subtotal: number
  emoji?: string
}

export interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone?: string
  table_number?: string
  status: OrderStatus
  subtotal: number
  tax: number
  total: number
  items: OrderItem[]
  staff?: User
  payment_method?: 'cash' | 'upi' | 'card'
  created_at: string
  updated_at: string
}

export interface Ingredient {
  id: number
  name: string
  unit: string
  current_stock: number
  minimum_stock: number
  cost_per_unit: number
  status?: 'OK' | 'Low Stock' | 'Out of Stock'
}

export interface AuditLog {
  id: number
  user_name: string
  action: string
  entity_type: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface SystemSettings {
  cafe_name: string
  tax_percentage: number
  whatsapp_number: string
  currency: string
  logo_url?: string
  auto_backup_enabled: boolean
}

export interface AnalyticsSummary {
  today_revenue: number
  weekly_revenue: number
  monthly_revenue: number
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  active_staff: number
  low_stock_count: number
  avg_order_value: number
  completion_rate: number
  avg_completion_minutes: number
}
