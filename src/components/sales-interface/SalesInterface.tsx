import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Receipt, Wallet, CreditCard, RotateCcw, Search, Barcode, History } from "lucide-react";
import BarcodeScanner from "./BarcodeScanner";
import ProductList from "./ProductList";
import Cart from "./Cart";
import ReturnDialog from "./ReturnDialog";
import DailySalesFooter from "./DailySalesFooter";
import ReturnsManager from "./ReturnsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SalesInvoice } from '../sales_invoices/SalesInvoices';
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from 'date-fns/locale';

interface SalesInterfaceProps {
  currentUser: { id: number; name: string };
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  barcode: string;
  stock: number;
  category?: {
    name: string;
    color: string;
  };
  created_at?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export interface Cashier {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "manager";
}

interface SaleInvoice {
  id: string;
  invoice_number: string;
  date: string;
  created_at: string;
  cashier_id: number;
  total_amount: number;
  payment_method: string;
  status: string;
  customer_id?: string | null;
  customer_name?: string;
  cashier: Cashier; 
  phone?: string;
  items: SaleItem[];
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  returned_quantity: number;
  product?: {
    name: string;
    barcode: string;
    category?: {
      name: string;
      color: string;
    };
  };
}

type PaymentMethod = "cash" | "vodafone_cash" | "insta_pay";

const SalesInterface = () => {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<Cashier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [salesHistory, setSalesHistory] = useState<SaleInvoice[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastInvoiceInfo, setLastInvoiceInfo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saleTrigger, setSaleTrigger] = useState(0);
  const [returnTrigger, setReturnTrigger] = useState(0);
  const [activeView, setActiveView] = useState<"sales" | "returns">("sales");
  const { toast } = useToast();  
  const [filteredInvoices, setFilteredInvoices] = useState<SalesInvoice[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [productsResponse, salesResponse, categoriesResponse] = await Promise.all([
          api.get("/api/products", {
            params: { include: "category", in_stock: true },
            headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          }),
          api.get("/api/sales-invoices", {
            params: {
              limit: 50,
              order_by: "created_at",
              order_direction: "desc",
              include: "items.product.category, cashier",
            },
            headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          }),
          api.get("/api/categories", {
            headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          }),
        ]);

        const processedProducts = productsResponse.data.map((product: any) => ({
          ...product,
          sale_price: product.sale_price ? Number(product.sale_price) : 0,
        }));

        const sortedSales = salesResponse.data.sort((a: SaleInvoice, b: SaleInvoice) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setProducts(processedProducts);
        setSalesHistory(sortedSales);
        setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError("فشل تحميل البيانات من السيرفر");
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل تحميل البيانات",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [toast, saleTrigger, returnTrigger]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/api/get-user", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        if (response.data?.user) setCurrentUser(response.data.user);
      } catch (error) {
        console.error("Failed to fetch current user", error);
        toast({ title: "خطأ", description: "فشل تحميل بيانات المستخدم", variant: "destructive" });
      }
    };
     const timer = setTimeout(() => {
    fetchCurrentUser();
  }, 2000); // 2 ثانية

  return () => clearTimeout(timer); // تنظيف عند إلغاء المكون
    // fetchCurrentUser();
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey && event.key === "s") || (event.ctrlKey && event.key === "Enter")) {
        event.preventDefault();
        handleCheckout(false, customerName, customerPhone, customerId);
      } else if (event.ctrlKey && event.key === "p") {
        event.preventDefault();
        handleCheckout(true, customerName, customerPhone, customerId);
      } else if (event.ctrlKey && event.altKey && event.key === "p") {
        event.preventDefault();
        if (salesHistory.length > 0) handlePrintInvoice(salesHistory[0].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, salesHistory, customerName, customerPhone, customerId]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem && existingItem.quantity >= product.stock) {
      toast({
        title: "الكمية غير متوفرة",
        description: `لا يوجد مخزون كافي من ${product.name}`,
        variant: "destructive",
      });
      return;
    }
    setCart(
      existingItem
        ? cart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...cart, { ...product, quantity: 1 }]
    );
    toast({
      title: "تم إضافة المنتج",
      description: `تم إضافة ${product.name} إلى السلة`,
    });
  };

  const handleProductAdded = (newProduct: Product) => {
    setProducts([...products, newProduct]);
    if (!showHistory) {
      addToCart(newProduct);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const product = products.find((p) => p.id === id);
    if (product && newQuantity > product.stock) {
      toast({
        title: "الكمية غير متوفرة",
        description: `لا يوجد مخزون كافي من ${product.name}`,
        variant: "destructive",
      });
      return;
    }
    setCart(
      newQuantity <= 0
        ? cart.filter((item) => item.id !== id)
        : cart.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
          )
    );
  };

  const removeFromCart = (id: string) => setCart(cart.filter((item) => item.id !== id));

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode.trim()) {
      setErrorMessage("باركود فارغ. يرجى إدخال باركود المنتج.");
      toast({
        title: "باركود فارغ",
        description: "يرجى إدخال باركود المنتج",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      if (showHistory) {
        const product = products.find((p) => p.barcode === barcode);
        if (!product) {
          setErrorMessage(`لم يتم العثور على منتج بالباركود ${barcode}`);
          setBarcode("");
          toast({
            title: "خطأ",
            description: `لم يتم العثور على منتج بالباركود ${barcode}`,
            variant: "destructive",
          });
          return;
        }

        const invoice = salesHistory.find((inv) =>
          inv.items.some(
            (item) =>
              item.product_id === product.id &&
              item.quantity > (item.returned_quantity || 0)
          )
        );

        if (!invoice) {
          setErrorMessage(`لم يتم العثور على فاتورة حديثة تحتوي على ${product.name} قابلة للاسترجاع`);
          setBarcode("");
          toast({
            title: "لا توجد فواتير",
            description: `لم يتم العثور على فاتورة حديثة تحتوي على ${product.name} قابلة للاسترجاع`,
            variant: "destructive",
          });
          return;
        }

        setSelectedInvoice(invoice);
        setLastInvoiceInfo(
          `تم استرجاع الفاتورة رقم ${invoice.invoice_number} بتاريخ ${new Date(
            invoice.created_at
          ).toLocaleDateString("ar-EG")}`
        );

        const initialReturns = invoice.items.reduce((acc, item) => {
          const maxReturnable = item.quantity - (item.returned_quantity || 0);
          if (maxReturnable > 0 && item.product_id === product.id) {
            acc[item.id] = 1;
          } else if (maxReturnable > 0) {
            acc[item.id] = 0;
          }
          return acc;
        }, {} as { [key: string]: number });

        setReturnItems(initialReturns);
        setReturnDialogOpen(true);
        setBarcode("");
        return;
      }

      const localProduct = products.find((p) => p.barcode === barcode);
      if (localProduct) {
        if (localProduct.stock <= 0) {
          setErrorMessage(`المنتج ${localProduct.name} غير متوفر في المخزون`);
          setBarcode("");
          toast({
            title: "المخزون غير متوفر",
            description: `المنتج ${localProduct.name} غير متوفر في المخزون`,
            variant: "destructive",
          });
          return;
        }

        addToCart(localProduct);
        setBarcode("");
        return;
      }

      try {
        const response = await api.get(`/api/products/barcode/${barcode}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });

        const newProduct = {
          ...response.data,
          sale_price: Number(response.data.sale_price || 0),
        };

        if (newProduct.stock <= 0) {
          setErrorMessage(`المنتج ${newProduct.name} غير متوفر في المخزون`);
          setBarcode("");
          toast({
            title: "المخزون غير متوفر",
            description: `المنتج ${newProduct.name} غير متوفر في المخزون`,
            variant: "destructive",
          });
          return;
        }

        addToCart(newProduct);
        setBarcode("");
        setProducts((prev) => [...prev, newProduct]);
      } catch (error: any) {
        console.error("Barcode error:", error);
        setErrorMessage(`لم يتم العثور على منتج بالباركود ${barcode}`);
        setBarcode("");
        toast({
          title: "خطأ",
          description: `لم يتم العثور على منتج بالباركود ${barcode}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      setErrorMessage(
        error.response?.data?.message ||
          `حدث خطأ غير متوقع أثناء البحث عن الباركود ${barcode}`
      );
      setBarcode("");
      toast({
        title: "خطأ",
        description: error.response?.data?.message || `حدث خطأ غير متوقع`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => cart.reduce((total, item) => total + item.sale_price * item.quantity, 0);

  const generateInvoiceNumber = () =>
    `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, "0")}${new Date().getDate().toString().padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const getPaymentMethodDetails = (method: string) => {
    switch (method) {
      case "cash":
        return { text: "نقدي", icon: <Wallet className="w-4 h-4 mr-2" /> };
      case "vodafone_cash":
        return { text: "فودافون كاش", icon: <CreditCard className="w-4 h-4 mr-2" /> };
      case "insta_pay":
        return { text: "انستا باي", icon: <CreditCard className="w-4 h-4 mr-2" /> };
      default:
        return { text: "غير معروف", icon: null };
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      setIsPrinting(true);
      const response = await api.get(`/api/sales-invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        params: { include: "items.product,user" },
      });
      const fullInvoiceData = response.data?.data || {};
      const safeInvoiceData = {
        ...fullInvoiceData,
        invoice_number: fullInvoiceData.invoice_number || `INV-${Date.now()}`,
        date: fullInvoiceData.date || new Date().toISOString().split("T")[0],
        created_at: fullInvoiceData.created_at || new Date().toISOString(),
        customer_id: fullInvoiceData.customer_id || null,
        customer_name: fullInvoiceData.customer_name || "عميل فوري",
        phone: fullInvoiceData.phone || null,
        items: (fullInvoiceData.items || []).map((item: any) => ({
          ...item,
          name: item.product?.name || item.product_name || "منتج غير معروف",
          unit_price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 0,
        })),
        total_amount: Number(fullInvoiceData.total_amount) || 0,
        paid_amount: Number(fullInvoiceData.paid_amount) || 0,
        payment_method: fullInvoiceData.payment_method || "cash",
        notes: fullInvoiceData.notes || null,
      };
      await generateInvoicePDF(safeInvoiceData);
    } catch (error) {
      console.error("Print error:", error);
      toast({ title: "خطأ في الطباعة", description: "حدث خطأ أثناء الطباعة", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

const generateInvoicePDF = async (invoiceData: any) => { 
  const safeData = JSON.parse(JSON.stringify(invoiceData));
  const paidAmount = safeData.paid_amount || safeData.total_amount || 0;
  const itemsTotal = safeData.items.reduce(
    (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity),
    0
  );
  const formattedDate = safeData.date
    ? new Date(safeData.date).toLocaleDateString("en-CA")
    : new Date().toLocaleDateString("en-CA");
  const formattedTime = safeData.created_at
    ? new Date(safeData.created_at).toLocaleTimeString("en-EG", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
  const paymentMethodDetails = getPaymentMethodDetails(safeData.payment_method || "cash");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("فشل فتح نافذة الطباعة: من المحتمل أن تكون النوافذ المنبثقة محظورة");
    alert("فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مرة أخرى.");
    return;
  }

  const printContent = `
    <html dir="rtl">
    <head>
      <title>فاتورة ${safeData.invoice_number}</title>
      <meta charset="UTF-8">
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
        .barcode-label { font-size: 10px; margin-top: 2px; }
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
      <div class="header">
        <div class="store-name">حلواني الحسن والحسين</div>
        <div class="invoice-title">فاتورة مبيعات</div>
      </div>
      <div class="info">
        <div class="info-row"><span class="info-label">التاريخ:</span><span>${formattedDate} ${formattedTime}</span></div>
        <div class="info-row"><span class="info-label">البائع:</span><span>${safeData.cashier?.name || currentUser?.name || "غير معروف"}</span></div>
        ${
          safeData.customer_name
            ? `<div class="info-row"><span class="info-label">العميل:</span><span>${safeData.customer_name}</span></div>`
            : ""
        }
        ${
          safeData.phone
            ? `<div class="info-row"><span class="info-label">رقم الهاتف:</span><span>${safeData.phone}</span></div>`
            : ""
        }
        <div class="info-row"><span class="info-label">حالة الدفع:</span><span class="status-badge paid">مدفوعة</span></div>
        <div class="info-row"><span class="info-label">طريقة الدفع:</span><span class="method-badge">${paymentMethodDetails.text}</span></div>
      </div>
      <table>
        <thead><tr><th style="width: 5%">#</th><th style="width: 40%">المنتج</th><th style="width: 20%">السعر</th><th style="width: 15%">الكمية</th><th style="width: 20%">الإجمالي</th></tr></thead>
        <tbody>
          ${safeData.items
            .map(
              (item: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name || item.product_name || "منتج غير معروف"}</td>
              <td>${Number(item.unit_price).toFixed(2)}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td>${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="total-row"><td colspan="2">المجموع</td><td colspan="3" style="text-align: left;">${itemsTotal.toFixed(
            2
          )} ج.م</td></tr>
        </tbody>
      </table>
      <div class="totals-box">
        <div class="total-item"><span>المجموع:</span><span class="total-value">${itemsTotal.toFixed(
          2
        )} ج.م</span></div>
        <div class="total-item"><span>المدفوع:</span><span class="total-value">${paidAmount.toFixed(
          2
        )} ج.م</span></div>
      </div>
      <div class="barcode-container">
        <canvas id="barcode"></canvas>
        <div class="barcode-label">${safeData.invoice_number || "غير معروف"}</div>
      </div>
      <div class="footer">
        <div>شكراً لزيارتكم - نتمنى لكم يومًا سعيدًا</div>
        <div>هاتف: 01024456408 | ${new Date().getFullYear()} ©</div>
      </div>
      <script>
        try {
          JsBarcode("#barcode", "${safeData.invoice_number || 'غير معروف'}", {
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

  // احتياطي: التأكد من إغلاق النافذة إذا فشل البرنامج النصي
  setTimeout(() => {
    if (!printWindow.closed) {
      console.warn("نافذة الطباعة لم تغلق تلقائيًا، يتم إغلاقها الآن");
      printWindow.close();
    }
  }, 1000);
};

  const handleCheckout = async (printAfterSave: boolean, customerName: string, customerPhone: string, customerId: string | null) => {
    if (cart.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى السلة أولاً",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true);
      const invoiceNumber = generateInvoiceNumber();
      const totalAmount = calculateTotal();
      const saleData = {
        invoice_number: invoiceNumber,
        date: new Date().toISOString().split("T")[0],
        customer_id: customerId || null,
        customer_name: customerName.trim() || "عميل فوري",
        phone: customerPhone.trim() || null,
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.sale_price),
          total_price: Number(item.quantity * item.sale_price),
        })),
        total_amount: Number(totalAmount),
        paid_amount: Number(totalAmount),
        status: "paid",
        payment_method: paymentMethod || "cash",
        user_id: currentUser?.id,
        notes: null,
        cashier_id: currentUser?.id,
      };

      if (!currentUser?.id) {
        throw new Error("معرف المستخدم غير متاح");
      }

      const response = await api.post("/api/sales-invoices", saleData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });

      setProducts(
        products.map((p) => {
          const soldItem = cart.find((item) => item.id === p.id);
          return soldItem ? { ...p, stock: p.stock - soldItem.quantity } : p;
        })
      );

      const newInvoice = {
        ...response.data,
        customer_id: saleData.customer_id,
        customer_name: saleData.customer_name,
        phone: saleData.phone,
        status: saleData.status,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.sale_price,
          total_price: item.quantity * item.sale_price,
          returned_quantity: 0,
        })),
        created_at: response.data.created_at,
        time: new Date().toLocaleTimeString(),
      };

      setSaleTrigger((prev) => prev + 1);
      setSalesHistory((prev) => [newInvoice, ...prev]);
      setCart([]);
      setBarcode("");
      setCustomerPhone("");
      setCustomerName("");
      setCustomerId(null);

      toast({
        title: "تمت العملية",
        description: `رقم الفاتورة: ${invoiceNumber} - المبلغ: ${totalAmount.toFixed(2)} ج.م`,
      });

      if (printAfterSave) await handlePrintInvoice(response.data.id);
    } catch (error: any) {
      console.error("Checkout error:", error);
      const errorMessage = error.response?.data?.message || "حدث خطأ أثناء إتمام البيع";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnItems = async () => {
    if (!selectedInvoice || Object.keys(returnItems).length === 0) {
      toast({
        title: "لا يوجد عناصر",
        description: "يرجى تحديد الكميات المراد استرجاعها",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true);
      const returnData = {
        sale_invoice_id: selectedInvoice.id,
        date: new Date().toISOString().split("T")[0],
        items: Object.entries(returnItems)
          .filter(([_, qty]) => qty > 0)
          .map(([itemId, qty]) => ({ sale_item_id: itemId, quantity: qty })),
      };
      await api.post("/api/sales-returns", returnData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });
      setProducts(
        products.map((p) => {
          const item = selectedInvoice.items.find(
            (i) => i.product_id === p.id && returnItems[i.id] > 0
          );
          return item ? { ...p, stock: p.stock + returnItems[item.id] } : p;
        })
      );
      setSalesHistory(
        salesHistory.map((inv) =>
          inv.id === selectedInvoice.id
            ? {
                ...inv,
                items: inv.items.map((item) => ({
                  ...item,
                  returned_quantity: returnItems[item.id]
                    ? (item.returned_quantity || 0) + returnItems[item.id]
                    : item.returned_quantity,
                })),
              }
            : inv
        )
      );
      toast({
        title: "تم الاسترجاع",
        description: `تم استرجاع ${Object.values(returnItems).reduce(
          (a, b) => a + b,
          0
        )} منتجات`,
      });
      setReturnDialogOpen(false);
      setSelectedInvoice(null);
      setReturnItems({});
      setReturnTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error("Return error:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "حدث خطأ أثناء الاسترجاع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case "cash":
        return "نقدي";
      case "vodafone_cash":
        return "فودافون كاش";
      case "insta_pay":
        return "انستا باي";
      default:
        return "غير محدد";
    }
  };

  const handleExportData = (type: string, data: SaleInvoice[], filters: any) => {
    const filename = `returns_${new Date().toISOString().split('T')[0]}.${type}`;
    if (type === "csv") {
      exportToCSV(data, filename);
    } else if (type === "pdf") {
      exportToPDF(data, filename);
    }
  };

  const exportToCSV = (data: SaleInvoice[], filename: string) => {
    const headers = ['رقم المعرف', 'رقم الفاتورة', 'التاريخ', 'الاجمالي', 'حالة الدفع', 'الهاتف', 'الكاشير'];
    const rows = data.map(invoice => [
      invoice.id,
      invoice.invoice_number,
      format(new Date(invoice.created_at), 'yyyy/MM/dd HH:mm', { locale: ar }),
      Number(invoice.total_amount).toFixed(2),
      getPaymentMethodName(invoice.payment_method),
      invoice.phone || '-',
      invoice.cashier.name
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "تصدير CSV",
      description: "تم تصدير البيانات إلى ملف CSV بنجاح",
    });
  };

  const exportToPDF = (data: SaleInvoice[], filename: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont("Amiri-Regular", "normal"); // Assuming Arabic font is loaded

    autoTable(doc, {
      head: [['المعرف', 'رقم الفاتورة', 'التاريخ', 'المبلغ الإجمالي', 'طريقة الدفع', 'رقم الهاتف', 'الحالة']],
      body: data.map(invoice => [
        invoice.id,
        invoice.invoice_number,
        format(new Date(invoice.created_at), 'yyyy/MM/dd HH:mm', { locale: ar }),
        invoice.total_amount.toFixed(2),
        getPaymentMethodName(invoice.payment_method),
        invoice.phone || '-',
        invoice.status
      ]),
      styles: { font: "Amiri-Regular", halign: 'right', fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [242, 242, 242] },
      margin: { top: 20 },
      didDrawPage: (data) => {
        doc.setFontSize(12);
        doc.text('تقرير المسترجعات', data.settings.margin.left, 10, { align: 'right' });
      },
    });

    doc.save(filename);

    toast({
      title: "تصدير PDF",
      description: "تم تصدير البيانات إلى ملف PDF بنجاح",
    });
  };

  const switchToReturns = () => setActiveView("returns");
  const switchToSales = () => setActiveView("sales");
return (
  <div className="space-y-2 pb-6 mb-6" dir="rtl">
    {/* الهيدر ثابت */}
    <div className="flex justify-between items-center">
      {/* <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        نظام المبيعات والمسترجعات
      </h1> */}

      <div className="flex gap-2">
        <Button
          onClick={switchToSales}
          variant={activeView === "sales" ? "default" : "outline"}
          className="flex items-center gap-1"
        >
          <Receipt className="h-4 w-4" />
          واجهة المبيعات
        </Button>
        <Button
          onClick={switchToReturns}
          variant={activeView === "returns" ? "default" : "outline"}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-4 w-4" />
          إدارة المسترجعات
        </Button>
      </div>
    </div>

    {/* الجزء المتغير فقط */}
    <AnimatePresence mode="wait">
      {activeView === "sales" && (
        <motion.div
          key="sales"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2">
            <DailySalesFooter
              currentUser={currentUser}
              saleTrigger={saleTrigger}
              returnTrigger={returnTrigger}
            />
            <BarcodeScanner
              barcode={barcode}
              setBarcode={setBarcode}
              handleBarcodeSubmit={handleBarcodeSubmit}
              isLoading={isLoading}
              showHistory={showHistory}
              lastInvoiceInfo={lastInvoiceInfo}
              errorMessage={errorMessage}
              setErrorMessage={setErrorMessage}
              autoSubmitOnLength={13}
              categories={categories}
              onProductAdded={handleProductAdded}
            />
            <ProductList
              products={products}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              addToCart={addToCart}
              salesHistory={salesHistory}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              isLoading={isLoading}
              setSelectedInvoice={setSelectedInvoice}
              setReturnItems={setReturnItems}
              setReturnDialogOpen={setReturnDialogOpen}
              getPaymentMethodName={getPaymentMethodName}
            />
          </div>
          <div className="space-y-4">
            <Cart
              cart={cart}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              calculateTotal={calculateTotal}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerId={customerId}
              setCustomerId={setCustomerId}
              onCheckout={handleCheckout}
              isLoading={isLoading}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
              getPaymentMethodName={getPaymentMethodName}
            />
          </div>
        </motion.div>
      )}

      {activeView === "returns" && (
        <motion.div
          key="returns"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ type: "spring", damping: 30, stiffness: 400 }}
        >
          <ReturnsManager
            salesHistory={salesHistory}
            setSelectedInvoice={setSelectedInvoice}
            setReturnItems={setReturnItems}
            setReturnDialogOpen={setReturnDialogOpen}
            getPaymentMethodName={getPaymentMethodName}
            onExportData={handleExportData}
          />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Return Dialog ثابت */}
    <ReturnDialog
      open={returnDialogOpen}
      onOpenChange={setReturnDialogOpen}
      selectedInvoice={selectedInvoice}
      returnItems={returnItems}
      setReturnItems={setReturnItems}
      handleReturnItems={handleReturnItems}
      isLoading={isLoading}
      getPaymentMethodName={getPaymentMethodName}
      currentUser={currentUser}
    />
  </div>
);

};

export default SalesInterface;