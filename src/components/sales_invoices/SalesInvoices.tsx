import { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays, subWeeks, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight, Wallet, CreditCard } from "lucide-react";
import Header from "./Header";
import Filters from "./Filters";
import InvoicesList from "./InvoicesList";
import InvoiceDetailDialog from "./InvoiceDetailDialog";
import PrintConfirmationDialog from "./PrintConfirmationDialog";
import NewInvoiceDialog from "./NewInvoiceDialog";
import PaymentDialog from "./PaymentDialog";
import { AbilityContext, defineAbilityFor } from "@/config/ability";

interface User {
  id: string;
  name: string;
  deleted_at?: string;
}

interface ProductItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  total_purchases: number;
  purchases_count: number;
  last_purchase_date: string;
  created_at: string;
  updated_at: string;
}

export interface Cashier {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  deleted_at?: string;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  date: string;
  time?: string;
  created_at: string;
  updated_at: string;
  items: ProductItem[];
  total_amount: number;
  user_id: number;
  cashier_id: number;
  paid_amount: number;
  user: Cashier;
  cashier: Cashier;
  customer_name?: string;
  phone?: string;
  status: "paid" | "partial" | "unpaid";
  payment_method: "cash" | "vodafone_cash" | "insta_pay" | "credit" | string;
  notes?: string;
  user_name?: string;
  cashier_name?: string;
  is_user_deleted?: boolean;
  is_cashier_deleted?: boolean;
}

export type PaymentStatus = "paid" | "partial" | "unpaid";
type PaginationMode = "daily" | "weekly" | "monthly" | "all";

const SalesInvoices = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SalesInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>("all");
  const [currentDateRange, setCurrentDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<SalesInvoice | null>(null);
  const [currentUser, setCurrentUser] = useState<Cashier | null>(null);
  const [newInvoiceDialogOpen, setNewInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [isProductSearchLoading, setIsProductSearchLoading] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "all">("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<"all" | "عميل فوري" | "other">("all");
  const [specificDate, setSpecificDate] = useState<string>("");
  const [specificWeek, setSpecificWeek] = useState<string>("");
  const [specificMonth, setSpecificMonth] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const ability = useContext(AbilityContext);

  const invoicesPerPage = 10;

  const canViewAllInvoices = currentUser?.roles.includes("admin") || currentUser?.roles.includes("manager");

  // استخدام useRef لتتبع ما إذا تم جلب البيانات من قبل (للـ caching البسيط داخل الـ component lifecycle)
  const hasFetchedCurrentUser = useRef(false);
  const hasFetchedCustomers = useRef(false);
  const hasFetchedUsers = useRef(false);
  const hasFetchedInvoices = useRef(false);

  // دالة محسنة لجلب العملاء مع تحقق من الجلب السابق
  const fetchCustomers = async () => {
    if (hasFetchedCustomers.current && customers.length > 0) {
      return; // لا تجلب إذا تم الجلب من قبل وبيانات موجودة
    }
    try {
      const response = await api.get("/api/customers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      
      let customersData = [];
      if (Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        customersData = response.data.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
        customersData = response.data.data.data;
      }
      
      setCustomers(customersData);
      hasFetchedCustomers.current = true;
    } catch (error: any) {
      console.error("Error fetching customers:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل تحميل بيانات العملاء",
        variant: "destructive",
      });
    }
  };

  // دالة محسنة لجلب المستخدمين مع تحقق من الجلب السابق
  const fetchUsers = async () => {
    if (hasFetchedUsers.current && users.length > 0) {
      return; // لا تجلب إذا تم الجلب من قبل وبيانات موجودة
    }
    try {
      const response = await api.get("/api/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        params: { with_trashed: true },
      });
      
      let fetchedUsers = [];
      if (Array.isArray(response.data)) {
        fetchedUsers = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        fetchedUsers = response.data.users;
      } else if (response.data && Array.isArray(response.data.data)) {
        fetchedUsers = response.data.data;
      }
      
      setUsers(fetchedUsers);
      hasFetchedUsers.current = true;
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل تحميل بيانات المستخدمين",
        variant: "destructive",
      });
    }
  };

  // جلب المستخدم الحالي مع تحقق من الجلب السابق
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (hasFetchedCurrentUser.current && currentUser) {
        setIsLoading(false);
        return; // لا تجلب إذا تم الجلب من قبل وبيانات موجودة
      }
      try {
        setIsLoading(true);
        const response = await api.get("/api/get-user", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        
        if (response.data?.user) {
          const user = response.data.user;
          if (!user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
            console.error("User roles are missing or invalid:", user);
            toast({
              title: "خطأ في بيانات المستخدم",
              description: "بيانات الأدوار غير متاحة. سيتم استخدام دور افتراضي.",
              variant: "destructive",
            });
            setCurrentUser({
              id: user.id,
              name: user.name || "غير معروف",
              email: user.email || "",
              roles: ["guest"],
              permissions: [],
            });
            defineAbilityFor("guest");
            return;
          }

          setCurrentUser({
            id: user.id,
            name: user.name || "غير معروف",
            email: user.email || "",
            roles: user.roles,
            permissions: user.permissions || [],
          });
          defineAbilityFor(user.roles[0]);
          hasFetchedCurrentUser.current = true;
        } else {
          toast({
            title: "خطأ في بيانات المستخدم",
            description: "لم يتم العثور على بيانات المستخدم الصحيحة",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Failed to fetch current user:", error);
        toast({
          title: "خطأ في تحميل بيانات البائع",
          description: error.response?.data?.message || "فشل تحميل معلومات المستخدم الحالي",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCurrentUser();
    fetchCustomers();
    fetchUsers();
  }, [toast]);

  // دالة محسنة لجلب الفواتير مع تحقق من الجلب السابق (جلب مرة واحدة فقط، والترتيب محليًا)
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!currentUser?.id || (hasFetchedInvoices.current && invoices.length > 0)) {
        setIsLoading(false);
        return; // لا تجلب إذا تم الجلب من قبل أو المستخدم غير موجود
      }

      try {
        setIsLoading(true);
        setError(null);
        const params: any = {
          include: "items.product,user,cashier,user.role,cashier.role",
          per_page: 1000,
          with_trashed: true,
        };

        if (!canViewAllInvoices) {
          params.user_id = currentUser.id;
        }

        const response = await api.get("/api/sales-invoices", {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });

        let invoicesData = [];
        if (Array.isArray(response.data)) {
          invoicesData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          invoicesData = response.data.data;
        } else if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
          invoicesData = response.data.data.data;
        }

        const formattedInvoices = invoicesData.map((invoice: any) => {
          const totalAmount = Number(invoice.total_amount) || 0;
          const paidAmount = Number(invoice.paid_amount) || 0;
          const tolerance = 0.01;
          let status: PaymentStatus = "unpaid";
          if (paidAmount >= totalAmount - tolerance) status = "paid";
          else if (paidAmount > 0) status = "partial";

          const userFromList = users.find((u) => u.id === String(invoice.user_id));
          const cashierFromList = users.find((u) => u.id === String(invoice.cashier_id));

          return {
            ...invoice,
            items: invoice.items?.map((item: any) => ({
              ...item,
              name: item.product?.name || item.name || "منتج غير معروف",
              unit_price: Number(item.unit_price) || 0,
              total_price: Number(item.total_price) || 0,
            })) || [],
            user: invoice.user || { id: 0, name: "غير معروف", email: "", roles: [], permissions: [] },
            cashier: invoice.cashier || invoice.user || { id: 0, name: "غير معروف", email: "", roles: [], permissions: [] },
            user_name: invoice.user_name || userFromList?.name || invoice.user?.name || "مستخدم محذوف",
            cashier_name: invoice.cashier_name || cashierFromList?.name || invoice.cashier?.name || "مستخدم محذوف",
            is_user_deleted: !invoice.user || invoice.user?.deleted_at || userFromList?.deleted_at,
            is_cashier_deleted: !invoice.cashier || invoice.cashier?.deleted_at || cashierFromList?.deleted_at,
            time: invoice.created_at ? new Date(invoice.created_at).toLocaleTimeString() : "--:--",
            total_amount: totalAmount,
            paid_amount: paidAmount,
            status,
            phone: invoice.phone || null,
          };
        });

        setInvoices(formattedInvoices);
        hasFetchedInvoices.current = true;
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        setError("فشل تحميل الفواتير من السيرفر");
        let errorMessage = "فشل تحميل الفواتير";
        if (error.response?.status === 401) errorMessage = "غير مصرح بالوصول، يرجى تسجيل الدخول أولاً";
        else if (error.response?.data?.message) errorMessage = error.response.data.message;
        toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchInvoices();
    }
  }, [currentUser, toast, canViewAllInvoices, users]);

  // دالة محسنة لجلب المنتجات (يتم فقط عند فتح الديالوج، ومع البحث)
  useEffect(() => {
    if (newInvoiceDialogOpen) {
      const fetchProducts = async () => {
        setIsProductSearchLoading(true);
        try {
          const response = await api.get("/api/products", {
            params: { search: productSearch, per_page: 50 },
            headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          });
          
          let productsData = [];
          if (Array.isArray(response.data)) {
            productsData = response.data;
          } else if (response.data && Array.isArray(response.data.data)) {
            productsData = response.data.data;
          } else if (response.data && response.data.data && Array.isArray(response.data.data.data)) {
            productsData = response.data.data.data;
          }
          
          setProducts(productsData);
        } catch (error) {
          console.error("Error fetching products", error);
          toast({ title: "خطأ", description: "فشل تحميل المنتجات", variant: "destructive" });
        } finally {
          setIsProductSearchLoading(false);
        }
      };
      fetchProducts();
    }
  }, [newInvoiceDialogOpen, productSearch, toast]);

  // تصفية وترتيب الفواتير محليًا (بدون إعادة جلب من السيرفر)
  useEffect(() => {
    let filtered = [...invoices];

    // الترتيب محليًا حسب created_at
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    
    // التصفية حسب المستخدم المحدد
    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter(invoice => 
        invoice.cashier?.id === selectedUserId || invoice.user?.id === selectedUserId
      );
    } else if (!selectedUserId || selectedUserId === "all") {
      // إذا لم يتم تحديد مستخدم أو تم اختيار "الكل"، لا تقم بتصفية حسب المستخدم
    } else if (!canViewAllInvoices) {
      // إذا لم يكن لدى المستخدم صلاحية رؤية الجميع، اعرض فقط فواتيره
      filtered = filtered.filter(invoice => 
        invoice.cashier?.id === currentUser?.id || invoice.user?.id === currentUser?.id
      );
    }

    if (searchTerm) {
      filtered = filtered.filter((invoice) =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.user_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (currentDateRange) {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        return isWithinInterval(invoiceDate, { start: currentDateRange.start, end: currentDateRange.end });
      });
    }
    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === paymentStatusFilter);
    }
    if (customerTypeFilter === "عميل فوري") {
      filtered = filtered.filter((invoice) => invoice.customer_name === "عميل فوري");
    } else if (customerTypeFilter === "other") {
      filtered = filtered.filter((invoice) => invoice.customer_name !== "عميل فوري" && invoice.customer_name);
    }
    setFilteredInvoices(filtered);
    setCurrentPage(0);
  }, [invoices, searchTerm, currentDateRange, paymentStatusFilter, customerTypeFilter, selectedUserId, canViewAllInvoices, currentUser, sortOrder]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("eg-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    return status === "paid" ? "bg-green-100 text-green-800" : status === "partial" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  };

  const getPaymentStatusText = (status: PaymentStatus) => {
    return status === "paid" ? "مدفوعة" : status === "partial" ? "جزئي" : "غير مدفوعة";
  };

  const getPaymentMethodDetails = (method: string) => {
    switch (method) {
      case "cash":
        return { icon: <Wallet className="w-4 h-4" />, text: "نقدي", color: "text-green-600 dark:text-green-400" };
      case "vodafone_cash":
        return { icon: <CreditCard className="w-4 h-4" />, text: "فودافون كاش", color: "text-red-600 dark:text-red-400" };
      case "insta_pay":
        return { icon: <CreditCard className="w-4 h-4" />, text: "إنستا باي", color: "text-blue-600 dark:text-blue-400" };
      case "credit":
        return { icon: <CreditCard className="w-4 h-4" />, text: "بطاقة ائتمان", color: "text-purple-600 dark:text-purple-400" };
      default:
        return { icon: <Wallet className="w-4 h-4" />, text: "غير محدد", color: "text-gray-600 dark:text-gray-400" };
    }
  };

  const handleDateSelection = (mode: PaginationMode, value?: string) => {
    let start: Date, end: Date;
    const today = new Date();
    switch (mode) {
      case "daily":
        if (value) {
          start = startOfDay(new Date(value));
          end = endOfDay(new Date(value));
          setSpecificDate(value);
        } else {
          start = startOfDay(today);
          end = endOfDay(today);
          setSpecificDate(format(today, "yyyy-MM-dd"));
        }
        break;
      case "weekly":
        if (value) {
          start = startOfWeek(new Date(value), { weekStartsOn: 0 });
          end = endOfWeek(new Date(value), { weekStartsOn: 0 });
          setSpecificWeek(value);
        } else {
          start = startOfWeek(today, { weekStartsOn: 0 });
          end = endOfWeek(today, { weekStartsOn: 0 });
          setSpecificWeek(format(today, "yyyy-MM-dd"));
        }
        break;
      case "monthly":
        if (value) {
          start = startOfMonth(new Date(value));
          end = endOfMonth(new Date(value));
          setSpecificMonth(value);
        } else {
          start = startOfMonth(today);
          end = endOfMonth(today);
          setSpecificMonth(format(today, "yyyy-MM"));
        }
        break;
      case "all":
      default:
        setCurrentDateRange(null);
        setSpecificDate("");
        setSpecificWeek("");
        setSpecificMonth("");
        return;
    }
    setCurrentDateRange({ start, end });
    setPaginationMode(mode);
  };

  const getLast7Days = () => {
    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = subDays(new Date(), i);
      result.push({
        value: format(date, "yyyy-MM-dd"),
        label: format(date, "dd/MM/yyyy"),
      });
    }
    return result;
  };

  const getLast4Weeks = () => {
    const result = [];
    for (let i = 0; i < 4; i++) {
      const date = subWeeks(new Date(), i);
      result.push({
        value: format(date, "yyyy-MM-dd"),
        label: `الأسبوع ${format(date, "dd/MM/yyyy")}`,
      });
    }
    return result;
  };

  const getLast12Months = () => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      result.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MM/yyyy"),
      });
    }
    return result;
  };

  const resetDateFilters = () => {
    setSpecificDate("");
    setSpecificWeek("");
    setSpecificMonth("");
    setCurrentDateRange(null);
    setPaginationMode("all");
    
    // إعادة تعيين فلتر المستخدمين أيضاً
    if (canViewAllInvoices) {
      setSelectedUserId("all");
    } else {
      setSelectedUserId(currentUser?.id || null);
    }
  };

const generateLocalPDF = (invoice: SalesInvoice) => {
  try {
    const itemsTotal = invoice.items.reduce((sum, item) => sum + Number(item.total_price), 0);
    const paidAmount = Number(invoice.paid_amount) || 0;
    const remaining = invoice.total_amount - paidAmount;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "خطأ", description: "فشل فتح نافذة الطباعة", variant: "destructive" });
      return;
    }

    const printContent = `
      <!DOCTYPE html> 
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.invoice_number}</title>
       <script src="/libs/JsBarcode.all.min.js"></script>
    <style>
        * { 
          font-family: 'Courier New', monospace; 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          width: 80mm; 
          margin: 0 auto; 
          padding: 2mm; 
          color: #000; 
          font-size: 12px; 
          line-height: 1.3; 
          background: #fff;
        }
        .header { 
          text-align: center; 
          margin-bottom: 5px; 
          padding-bottom: 5px; 
          border-bottom: 1px dashed #000; 
        }
        .store-name { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
        .invoice-title { font-size: 14px; margin: 3px 0; }
        .invoice-number { font-size: 13px; font-weight: bold; background: #f0f0f0; padding: 2px 5px; display: inline-block; border-radius: 3px; }
        .info { margin: 8px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
        .info-label { font-weight: bold; min-width: 60px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
        th, td { padding: 4px 2px; text-align: right; border-bottom: 1px solid #ddd; }
        th { font-weight: bold; border-bottom: 2px solid #000; }
        .total-row { font-weight: bold; border-top: 2px solid #000; }
        .status-badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 10px; font-weight: bold; }
        .paid { background: #e6f7e6; color: #0a5c0a; }
        .method-badge { display: inline-block; padding: 2px 5px; border-radius: 3px; background: #f0f0f0; font-size: 10px; }
        .totals-box { border: 1px solid #000; padding: 8px; margin-top: 8px; font-size: 12px; }
        .total-item { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .total-value { font-weight: bold; }
        .footer { margin-top: 10px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #aaa; padding-top: 5px; }
        .barcode-container { 
          text-align: center; 
          margin: 8px 0; 
        }
        .barcode-container img,
        .barcode-container canvas {
          max-width: 250px; 
          height: auto;
        }
        .barcode-label { font-size: 10px; margin-top: -4px; }
        @media print {
          @page {
            size: auto;  
            margin: 0mm auto;
          }
          body { 
            width: 80mm; 
            margin: 0 auto; 
            padding: 2mm; 
          }
        }
      </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          <div class="header">
            <div class="store-name">حلواني الحسن والحسين</div>
            <div class="invoice-title">فاتورة مبيعات</div>
          </div>
          <div class="info">
            <div class="info-row">
              <span class="info-label">التاريخ:</span>
              <span>${formatDate(invoice.date)} ${invoice.time || "--:--"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">البائع:</span>
              <span>${invoice.cashier_name}${invoice.is_cashier_deleted ? ' (محذوف)' : ''}</span>
            </div>
            ${invoice.customer_name ? `
              <div class="info-row">
                <span class="info-label">العميل:</span>
                <span>${invoice.customer_name}</span>
              </div>
            ` : ""}
            ${invoice.phone ? `
              <div class="info-row">
                <span class="info-label">رقم الهاتف:</span>
                <span>${invoice.phone}</span>
              </div>
            ` : ""}
            <div class="info-row">
              <span class="info-label">حالة الدفع:</span>
              <span>${getPaymentStatusText(invoice.status)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">طريقة الدفع:</span>
              <span>${getPaymentMethodDetails(invoice.payment_method).text}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">#</th>
                <th style="width: 40%">المنتج</th>
                <th style="width: 15%">السعر</th>
                <th style="width: 15%">الكمية</th>
                <th style="width: 20%">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${Number(item.unit_price).toFixed(2)}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td>${Number(item.total_price).toFixed(2)}</td>
                </tr>
              `).join("")}
              <tr class="total-row">
                <td colspan="2">المجموع</td>
                <td colspan="3" style="text-align: left;">${Number(itemsTotal).toFixed(2)} ج.م</td>
              </tr>
            </tbody>
          </table>
          <div class="totals-box">
            <div class="total-item">
              <span>المجموع:</span>
              <span class="total-value">${Number(itemsTotal).toFixed(2)} ج.م</span>
            </div>
            ${paidAmount > 0 ? `
              <div class="total-item">
                <span>المدفوع:</span>
                <span class="total-value">${Number(paidAmount).toFixed(2)} ج.م</span>
              </div>
            ` : ""}
            ${remaining > 0 ? `
              <div class="total-item">
                <span>المتبقي:</span>
                <span class="total-value">${Number(remaining).toFixed(2)} ج.م</span>
              </div>
            ` : ""}
          </div>
          ${invoice.notes ? `
            <div class="notes">
              <strong>ملاحظات:</strong>
              <p>${invoice.notes}</p>
            </div>
          ` : ""}
          <div class="barcode-container">
            <canvas id="barcode"></canvas>
            <div class="barcode-label">${invoice.invoice_number}</div>
          </div>
          <div class="footer">
            <div>شكراً لزيارتكم - نتمنى لكم يومًا سعيدًا</div>
            <div>هاتف: 01024456408 | ${new Date().getFullYear()} ©</div>
          </div>
        </div>
        <script>
          try {
            JsBarcode("#barcode", "${invoice.invoice_number}", {
              format: "CODE128",
              width: 2,
              height: 30,
              displayValue: false,
              margin: 5
            });
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          } catch (e) {
            console.error("خطأ أثناء إنشاء الباركود أو الطباعة:", e);
            alert("حدث خطأ أثناء إنشاء الباركود أو الطباعة. يرجى المحاولة مرة أخرى.");
            window.close();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
        window.focus();
      };
    };

    // احتياطي: التأكد من إغلاق النافذة إذا فشل البرنامج النصي
    setTimeout(() => {
      if (!printWindow.closed) {
        console.warn("نافذة الطباعة لم تغلق تلقائيًا، يتم إغلاقها الآن");
        printWindow.close();
      }
    }, 2000);
  } catch (error) {
    console.error("Error generating local PDF:", error);
    toast({ title: "خطأ", description: "فشل إنشاء الفاتورة محلياً", variant: "destructive" });
  }
};

  const handleCreateNewInvoice = async (customerName: string, phone: string, notes: string, customerId?: string) => {
    try {
      setIsLoading(true);
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const items = selectedProducts.map((sp) => ({
        product_id: sp.product.id,
        quantity: sp.quantity,
        unit_price: Number(sp.product.sale_price),
        total_price: Number(sp.quantity * sp.product.sale_price),
      }));
      const total_amount = items.reduce((sum, item) => sum + item.total_price, 0);
      if (!currentUser?.id) {
        throw new Error("معرف المستخدم غير متاح");
      }
      const payload = {
        invoice_number: invoiceNumber,
        date: new Date().toISOString().split("T")[0],
        customer_id: customerId || null,
        customer_name: customerName || "عميل فوري",
        phone: phone || null,
        items,
        total_amount: Number(total_amount),
        paid_amount: 0,
        payment_method: "cash",
        user_id: currentUser.id,
        user_name: currentUser.name,
        cashier_name: currentUser.name,
        status: "unpaid",
        notes: notes || null,
        is_user_deleted: false,
        is_cashier_deleted: false,
      };
      const response = await api.post("/api/sales-invoices", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      const newInvoice = {
        ...response.data,
        user: currentUser,
        cashier: currentUser,
        status: "unpaid" as PaymentStatus,
        items: items.map((item) => ({
          ...item,
          id: "",
          name: selectedProducts.find((sp) => sp.product.id === item.product_id)?.product.name || "",
        })),
        time: new Date().toLocaleTimeString(),
        created_at: new Date().toISOString(),
        phone: phone || undefined,
        user_name: currentUser.name,
        cashier_name: currentUser.name,
        is_user_deleted: false,
        is_cashier_deleted: false,
      };
      setInvoices([newInvoice, ...invoices]);
      setFilteredInvoices([newInvoice, ...filteredInvoices]);
      setSelectedInvoice(newInvoice);
      setIsInvoiceDialogOpen(true);
      setNewInvoiceDialogOpen(false);
      setSelectedProducts([]);
      toast({ title: "تم إنشاء فاتورة جديدة", description: `تم إنشاء الفاتورة رقم ${invoiceNumber}` });
    } catch (error: any) {
      console.error("Error creating new invoice:", error);
      let errorMessage = error.response?.data?.message || "فشل إنشاء الفاتورة الجديدة";
      toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice || paymentAmount <= 0) return;
    try {
      setIsLoading(true);
      const newPaidAmount = selectedInvoice.paid_amount + paymentAmount;
      const tolerance = 0.01;
      const totalAmount = selectedInvoice.total_amount;
      let newStatus: PaymentStatus = "unpaid";
      if (newPaidAmount >= totalAmount - tolerance) newStatus = "paid";
      else if (newPaidAmount > 0) newStatus = "partial";
      const response = await api.patch(
        `/api/sales-invoices/${selectedInvoice.id}/payment`,
        {
          paid_amount: newPaidAmount,
          status: newStatus,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }
      );
      const updatedInvoice = { ...selectedInvoice, paid_amount: newPaidAmount, status: newStatus };
      setInvoices(invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
      setFilteredInvoices(filteredInvoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
      setSelectedInvoice(updatedInvoice);
      setPaymentDialogOpen(false);
      setPaymentAmount(0);
      toast({
        title: "تمت عملية الدفع بنجاح",
        description: `تم تسجيل مبلغ ${paymentAmount} ج.م للفاتورة ${selectedInvoice.invoice_number}`,
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({ title: "خطأ", description: "فشل تسجيل عملية الدفع", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async (invoice: SalesInvoice) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/sales-invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setInvoices(invoices.filter((inv) => inv.id !== invoice.id));
      setFilteredInvoices(filteredInvoices.filter((inv) => inv.id !== invoice.id));
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(null);
        setIsInvoiceDialogOpen(false);
      }
      toast({ title: "تم الحذف", description: `تم حذف الفاتورة رقم ${invoice.invoice_number} بنجاح` });
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      let errorMessage = error.response?.data?.message || "فشل حذف الفاتورة";
      toast({ title: "خطأ", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  const paginatedInvoices = useMemo(() => {
    const startIndex = currentPage * invoicesPerPage;
    return filteredInvoices.slice(startIndex, startIndex + invoicesPerPage);
  }, [filteredInvoices, currentPage]);

  if (isLoading && !filteredInvoices.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileText className="w-12 h-12 text-red-500" />
        <p className="text-lg font-medium text-red-600">{error}</p>
        <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
      </div>
    );
  }
 return (
    <>
      <div className="space-y-6">
        <Header
          currentUser={currentUser}
          invoicesCount={invoices.length}
          filteredInvoicesCount={filteredInvoices.length}
          onNewInvoice={() => setNewInvoiceDialogOpen(true)}
          onCustomerChange={fetchCustomers}
          customers={customers}
          canViewAllInvoices={canViewAllInvoices}
        />
        <Filters
          search={searchTerm}
          setSearch={setSearchTerm}
          sort={sortOrder}
          setSort={setSortOrder}
          paymentStatus={paymentStatusFilter}
          setPaymentStatus={setPaymentStatusFilter}
          dateFilter={paginationMode}
          setDateFilter={setPaginationMode}
          specificDate={specificDate}
          setSpecificDate={setSpecificDate}
          specificWeek={specificWeek}
          setSpecificWeek={setSpecificWeek}
          specificMonth={specificMonth}
          setSpecificMonth={setSpecificMonth}
          resetDateFilters={resetDateFilters}
          getLast7Days={getLast7Days}
          getLast4Weeks={getLast4Weeks}
          getLast12Months={getLast12Months}
          canViewAllInvoices={canViewAllInvoices}
          currentUser={currentUser}
          users={users}
          setSelectedUserId={setSelectedUserId}
          selectedUserId={selectedUserId}
          allInvoices={invoices}
          customerType={customerTypeFilter}
          setCustomerType={setCustomerTypeFilter}
        />
      </div>

      <InvoicesList
        invoices={paginatedInvoices}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        getPaymentStatusColor={getPaymentStatusColor}
        getPaymentStatusText={getPaymentStatusText}
        formatDate={formatDate}
        currentUser={currentUser}
        onInvoiceClick={setSelectedInvoice}
        onPrintClick={setInvoiceToPrint}
        setPrintDialogOpen={setPrintDialogOpen}
        setIsInvoiceDialogOpen={setIsInvoiceDialogOpen}
        getPaymentMethodDetails={getPaymentMethodDetails}
        onDeleteClick={handleDeleteClick}
        canViewAllInvoices={canViewAllInvoices}
      />

      <InvoiceDetailDialog
        isOpen={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        invoice={selectedInvoice}
        formatDate={formatDate}
        getPaymentStatusColor={getPaymentStatusColor}
        getPaymentStatusText={getPaymentStatusText}
        currentUser={currentUser}
        onPrint={() => selectedInvoice && setInvoiceToPrint(selectedInvoice)}
        onAddPayment={() => {
          if (selectedInvoice) {
            setPaymentAmount(selectedInvoice.total_amount - selectedInvoice.paid_amount);
            setPaymentDialogOpen(true);
          }
        }}
        isLoading={isLoading}
        setPrintDialogOpen={setPrintDialogOpen}
        getPaymentMethodDetails={getPaymentMethodDetails}
      />

      <PrintConfirmationDialog
        isOpen={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        invoice={invoiceToPrint}
        onConfirm={() => {
          if (invoiceToPrint) generateLocalPDF(invoiceToPrint);
          setPrintDialogOpen(false);
        }}
        isLoading={isLoading}
      />

      <NewInvoiceDialog
        isOpen={newInvoiceDialogOpen}
        onOpenChange={setNewInvoiceDialogOpen}
        products={products}
        selectedProducts={selectedProducts}
        setSelectedProducts={setSelectedProducts}
        productSearch={productSearch}
        setProductSearch={setProductSearch}
        isProductSearchLoading={isProductSearchLoading}
        onCreateInvoice={handleCreateNewInvoice}
        isLoading={isLoading}
        categories={categories}
        customers={customers}
      />

      <PaymentDialog
        isOpen={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        onAddPayment={handleAddPayment}
        isLoading={isLoading}
      />
    </>
  );
};

export default SalesInvoices;