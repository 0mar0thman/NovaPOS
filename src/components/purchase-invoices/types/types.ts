export interface User {
  id: string;
  name: string;
  roles?: string[];
  permissions?: string[];
  deleted_at?: string | null;
}

export interface Product {
  id: number;
  name: string;
  unit_price: number;
  stock: number;
  purchase_price: number;
  category_id: number;
  category?: {
    id: number;
    name: string;
    color: string;
  };
}

export interface PurchaseInvoiceItem {
  id?: number;
  purchase_invoice_id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  number_of_units: number;
  amount_paid: number;
  expiry_date?: string;
  product?: Product;
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  cashier?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  creator?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  updated_by?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  date: string;
  supplier_id: number;
  cashier_name?: string;
  user_name?: string;
  cashier_display_name?: string;
  user_display_name?: string;
  total_amount: number;
  amount_paid: number;
  notes?: string;
  items: PurchaseInvoiceItem[];
  created_at: string;
  updated_at: string;
  user_id: string;
  supplier?: {
    id: number;
    phone: string;
    name: string;
    note?: string;
  };
}

export interface PurchaseInvoiceVersion {
  id: number;
  purchase_invoice_id: number;
  invoice_number: string;
  date: string;
  supplier_name?: string;
  supplier_phone?: string;
  total_amount: number;
  amount_paid: number;
  notes?: string;
  items: PurchaseInvoiceItem[];
  cashier?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  creator?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  updated_by?: {
    id: string;
    name: string;
    deleted_at?: string | null;
  };
  created_at: string;
  version_type: string;
  is_deleted?: boolean;
  cashier_name?: string;
  user_name?: string;
  cashier_display_name?: string;
  user_display_name?: string;
  is_cashier_deleted?: boolean;
}

export interface ProductOption {
  value: number;
  label: string;
  product: Product;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupplierOption {
  value: number;
  label: string;
  phone?: string;
}