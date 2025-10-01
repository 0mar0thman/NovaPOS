export interface User_Role {
    id: string;
    name: string;
    role_id?: number | null;
    roles: { id: number; name: string }[];
}

export interface Category {
    id: string;
    name: string;
    color: string;
}

export interface Role {
    id: string;
    name: string;
}

export interface ReportData {
    summary?: Array<{
        day?: string;
        week?: string;
        month?: string;
        invoices_count: number;
        total_sales: number;
        total_paid: number;
        average_sale: number;
        total_due: number;
    }>;
    top_customers?: Array<{
        customer_name: string;
        invoices_count: number;
        total_sales: number;
    }>;
    payment_methods?: Array<{
        payment_method: "cash" | "vodafone_cash" | "instapay";
        total: number;
        invoices_count: number;
    }>;
    products?: Array<{
        id: string;
        name: string;
        category_id: string;
        category_name?: string;
        quantity_sold: number;
        total_sales: number;
        total_cost: number;
        total_profit: number;
        profit_margin: number;
    }>;
    categories?: Array<{
        id: string;
        name: string;
        color: string;
        total_quantity: number;
        total_sales: number;
        category_name: string;
        total_cost: number;
        total_profit: number;
        profit_margin: number;
    }>;
    top_suppliers?: Array<{
        supplier_name: string;
        invoices_count: number;
        total_purchases: number;
        total_paid: number;
    }>;
    top_products?: Array<{
        id: string;
        name: string;
        quantity_purchased: number;
        total_purchases: number;
        average_price: number;
    }>;
    inventory?: Array<{
        id: string;
        name: string;
        barcode: string;
        category_id: string;
        category_name?: string;
        stock: number;
        min_stock: number;
        purchase_price: number;
        sale_price: number;
        stock_value: number;
        below_min_stock: boolean;
    }>;
    expiring_soon_items?: Array<{
        name: string;
        category_name?: string;
        expiry_date: string;
        quantity: number;
    }>;
    expired_items?: Array<{
        name: string;
        category_name?: string;
        expiry_date: string;
        quantity: number;
    }>;
    inventory_by_category?: Array<{
        id: string;
        name: string;
        total_value: number;
        products_count: number;
    }>;
    total_sales?: number;
    total_purchases?: number;
    cost_of_goods_sold?: number;
    gross_profit?: number;
    profit_by_category?: Array<{
        id: string;
        name: string;
        total_sales: number;
        total_cost: number;
        gross_profit: number;
        profit_margin: number;
    }>;
    profit_trend?: Array<{
        period: string;
        total_sales: number;
        total_cost: number;
        gross_profit: number;
        profit_margin: number;
    }>;
    employees?: Array<{
        id: string;
        name: string;
        total_sales: number;
        invoices_count: number;
        average_sale: number;
        total_invoices: number;
        average_invoice: number;
        total_paid: number;
        total_due: number;
    }>;
}

export interface FilterState {
    selectedReport: string;
    dateFrom: string;
    dateTo: string;
    groupBy: string;
    categoryId: string;
    userId: string;
    roleId: string;
    supplier: string;
}