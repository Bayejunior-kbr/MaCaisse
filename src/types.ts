export interface Expense {
  id: number;
  shop_id: number;
  user_id: number;
  userName?: string;
  title: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface User {
  id: number;
  shop_id: number;
  name: string;
  email: string;
  role: 'owner' | 'employee' | 'admin';
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  plan: 'free' | 'premium';
  logo_url?: string;
  language?: string;
  theme?: 'light';
  currency?: string;
  receipt_footer?: string;
  show_tax?: boolean;
  sms_enabled?: boolean;
  whatsapp_enabled?: boolean;
  notification_template?: string;
  has_ai_features?: boolean;
  subscription_expires_at?: string;
  status?: 'active' | 'blocked' | 'expired' | 'grace_period';
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  barcode?: string;
  image_url: string | null;
  category_id: number | null;
  supplier_id: number | null;
  categoryName?: string;
  supplierName?: string;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  min_quantity: number;
}

export interface Supplier {
  id: number;
  shop_id: number;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_debt?: number;
  created_at: string;
}

export interface CustomerPayment {
  id: number;
  shop_id: number;
  customer_id: number;
  user_id: number;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  productName: string;
  quantity: number;
  unit_price: number;
  unit_profit: number;
}

export interface Sale {
  id: number;
  total_amount: number;
  total_profit: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status?: 'paid' | 'debt' | 'partial';
  amount_paid?: number;
  status?: 'active' | 'cancelled';
  editCount?: number;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  editHistory?: Array<{
    id: number;
    reason: string;
    previous_total: number;
    updated_total: number;
    amount_difference: number;
    userName?: string;
    created_at: string;
  }>;
  created_at: string;
  userName: string;
  items?: SaleItem[];
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  logo_url?: string;
  receipt_footer?: string;
  currency?: string;
  show_tax?: boolean;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}

export interface DashboardStats {
  salesToday: number;
  profitToday: number;
  expensesToday: number;
  lowStockCount: number;
  totalProducts: number;
  totalStock: number;
  totalDebt: number;
  recentSales: { date: string; amount: number }[];
}
