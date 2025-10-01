import { useState, Dispatch, SetStateAction, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Barcode,
  History,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { ar } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  sale_price: number;
  barcode: string;
  stock: number;
  created_at?: string;
  category?: {
    name: string;
    color: string;
  };
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
  total_amount: number;
  payment_method: string;
  status: string;
  phone?: string;
  items: SaleItem[];
  cashier_id: number;
  cashier: Cashier;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name?: string;
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

interface ProductListProps {
  products: Product[];
  salesHistory: SaleInvoice[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  isLoading: boolean;
  addToCart: (product: Product) => void;
  setSelectedInvoice: Dispatch<SetStateAction<SaleInvoice | null>>;
  setReturnItems: (items: { [key: string]: number }) => void;
  setReturnDialogOpen: (open: boolean) => void;
  getPaymentMethodName: (method: string) => string;
}

const ProductList = ({
  products,
  salesHistory,
  searchTerm,
  setSearchTerm,
  showHistory,
  setShowHistory,
  isLoading,
  addToCart,
  setSelectedInvoice,
  setReturnItems,
  setReturnDialogOpen,
  getPaymentMethodName,
}: ProductListProps) => {
  const [productPage, setProductPage] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  
  // تحديد عدد الأعمدة حسب حجم الشاشة (3 صفوف ثابتة)
  const getGridConfig = () => {
    if (typeof window === 'undefined') return { cols: 2, productsPerPage: 6 };
    
    const width = window.innerWidth;
    const cardHeight = 140; // ارتفاع تقديري لكل بطاقة منتج
    const availableHeight = window.innerHeight - 300; // ارتفاع متاح بعد خصم الهيدر والفوتير
    const rows = Math.max(4, Math.floor(availableHeight / cardHeight)); // 3 صفوف كحد أدنى
    
    if (width < 480) { // هواتف صغيرة جداً
      return { cols: 2, productsPerPage: 2 * rows, className: "grid-cols-2" };
    } else if (width < 640) { // هواتف
      return { cols: 3, productsPerPage: 3 * rows, className: "grid-cols-3" };
    } else if (width < 768) { // هواتف كبيرة
      return { cols: 3, productsPerPage: 3 * rows, className: "grid-cols-3" };
    } else if (width < 1024) { // تابلت
      return { cols: 4, productsPerPage: 4 * rows, className: "grid-cols-4" };
    } else if (width < 1280) { // لابتوب
      return { cols: 5, productsPerPage: 5 * rows, className: "grid-cols-5" };
    } else if (width < 1536) { // شاشات كبيرة
      return { cols: 6, productsPerPage: 6 * rows, className: "grid-cols-6" };
    } else { // شاشات كبيرة جداً
      return { cols: 8, productsPerPage: 8 * rows, className: "grid-cols-8" };
    }
  };

  const [gridConfig, setGridConfig] = useState(getGridConfig());
  const historyPerPage = 10;

  // تحديث التكوين عند تغيير حجم الشاشة
  useEffect(() => {
    const handleResize = () => {
      setGridConfig(getGridConfig());
      setProductPage(0); // إعادة التعيين للصفحة الأولى عند تغيير الحجم
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sort products by created_at (newest to oldest)
  const sortedProducts = [...products].sort((a, b) => {
    if (!a.created_at || !b.created_at) return 0;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Filter products by search term
  const filteredProducts = sortedProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter sales history (last 14 days)
  const fourteenDaysAgo = subDays(new Date(), 14);

  // Filter and sort sales history by created_at (newest first)
  const filteredSalesHistory = salesHistory
    .filter((invoice) => new Date(invoice.created_at) >= fourteenDaysAgo)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // Search in sales history
  const searchedSalesHistory = filteredSalesHistory.filter((invoice) => {
    const searchLower = searchTerm.toLowerCase();

    // Check invoice number and phone
    if (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      (invoice.phone && invoice.phone.toLowerCase().includes(searchLower))
    ) {
      return true;
    }

    // Check items for product name or barcode
    return invoice.items.some((item) => {
      const productName = item.product_name || item.product?.name || "";
      const barcode = item.product?.barcode || "";
      return (
        productName.toLowerCase().includes(searchLower) ||
        barcode.toLowerCase().includes(searchLower)
      );
    });
  });

  // Paginate products
  const totalProductPages = Math.ceil(
    filteredProducts.length / gridConfig.productsPerPage
  );
  const paginatedProducts = filteredProducts.slice(
    productPage * gridConfig.productsPerPage,
    (productPage + 1) * gridConfig.productsPerPage
  );

  // Paginate sales history
  const totalHistoryPages = Math.ceil(
    searchedSalesHistory.length / historyPerPage
  );
  const paginatedSalesHistory = searchedSalesHistory.slice(
    historyPage * historyPerPage,
    (historyPage + 1) * historyPerPage
  );

  // تحسين الجدول للشاشات الصغيرة
  const TableResponsive = () => (
    <div className="overflow-x-auto">
      <Table dir="rtl" className="min-w-[600px]">
        <TableHeader>
          <TableRow className="dark:border-gray-700">
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">رقم الفاتورة</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">التاريخ</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">المبلغ</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap hidden sm:table-cell">رقم الهاتف</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap hidden md:table-cell">طريقة الدفع</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">الكمية</TableHead>
            <TableHead className="text-right dark:text-gray-300 whitespace-nowrap">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedSalesHistory.map((invoice) => {
            const totalQuantity = invoice.items.reduce(
              (sum, item) => sum + (item.quantity - (item.returned_quantity || 0)),
              0
            );
            return (
              <TableRow key={invoice.id} className="dark:border-gray-700 hover:dark:bg-gray-700/50">
                <TableCell className="font-medium dark:text-gray-200 text-sm">{invoice.invoice_number}</TableCell>
                <TableCell className="dark:text-gray-300 text-sm whitespace-nowrap">
                  {format(new Date(invoice.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}
                </TableCell>
                <TableCell className="dark:text-gray-300 text-sm">{Number(invoice.total_amount).toFixed(2)} ج.م</TableCell>
                <TableCell className="dark:text-gray-300 text-sm hidden sm:table-cell">{invoice.phone || '-'}</TableCell>
                <TableCell className="dark:text-gray-300 text-sm hidden md:table-cell">{getPaymentMethodName(invoice.payment_method)}</TableCell>
                <TableCell className="dark:text-gray-300 text-sm">{totalQuantity}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      const initialReturns = invoice.items.reduce((acc, item) => {
                        const maxReturnable = item.quantity - (item.returned_quantity || 0);
                        if (maxReturnable > 0) {
                          acc[item.id] = 0;
                        }
                        return acc;
                      }, {} as { [key: string]: number });
                      setReturnItems(initialReturns);
                      setReturnDialogOpen(true);
                    }}
                    disabled={invoice.items.every(
                      (item) => item.quantity === (item.returned_quantity || 0)
                    )}
                    className="dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 text-xs px-2"
                  >
                    <RotateCcw className="w-3 h-3 ml-1" />
                    استرجاع
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-blue-100 dark:border-gray-700 transition-all duration-300 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-lg sm:text-xl">
            <Search className="w-5 h-5" />
            {showHistory ? "سجل المبيعات" : "المنتجات المتاحة"}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowHistory(!showHistory);
              setProductPage(0);
              setHistoryPage(0);
            }}
            className="flex items-center gap-1 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 w-full sm:w-auto"
          >
            {showHistory ? (
              <>
                <Barcode className="w-4 h-4" />
                <span>عرض المنتجات</span>
              </>
            ) : (
              <>
                <History className="w-4 h-4" />
                <span>استرجاع سريع</span>
              </>
            )}
          </Button>
        </div>
        <div className="space-y-2 mt-4">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setProductPage(0);
              setHistoryPage(0);
            }}
            placeholder={
              showHistory
                ? "ابحث برقم الفاتورة، رقم الهاتف، اسم المنتج أو الباركود..."
                : "ابحث عن المنتجات بالاسم او السعر..."
            }
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 text-sm sm:text-base"
            disabled={isLoading}
            dir="rtl"
          />
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto">
        {showHistory ? (
          <div className="space-y-4 h-full">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
              آخر {historyPerPage} فواتير مبيعات (خلال 14 يومًا)
            </h3>
            {searchedSalesHistory.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm sm:text-base">
                {searchTerm ? "لم يتم العثور على فواتير مطابقة" : "لا يوجد فواتير مسجلة في آخر 14 يومًا"}
              </p>
            ) : (
              <>
                <TableResponsive />
                {totalHistoryPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-6" dir="rtl">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 0))}
                        disabled={historyPage === 0}
                        className={`transition-all duration-200 flex items-center gap-1 text-xs sm:text-sm ${
                          historyPage > 0
                            ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                            : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        السابق
                      </Button>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        الصفحة {historyPage + 1} من {totalHistoryPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages - 1))}
                        disabled={historyPage >= totalHistoryPages - 1}
                        className={`transition-all duration-200 flex items-center gap-1 text-xs sm:text-sm ${
                          historyPage < totalHistoryPages - 1
                            ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                            : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        التالي
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : isLoading ? (
          <div className={`grid ${gridConfig.className} gap-2 sm:gap-3`}>
            {[...Array(gridConfig.productsPerPage)].map((_, i) => (
              <Card key={i} className="border-blue-100 dark:border-gray-700 dark:bg-gray-700/30">
                <CardContent className="p-2 sm:p-3 space-y-2">
                  <Skeleton className="h-4 sm:h-5 w-3/4 mx-auto dark:bg-gray-600" />
                  <Skeleton className="h-3 sm:h-4 w-1/2 mx-auto dark:bg-gray-600" />
                  <Skeleton className="h-3 w-1/3 mx-auto dark:bg-gray-600" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className={`grid ${gridConfig.className} gap-2 sm:gap-3 flex-1`}>
              {paginatedProducts.map((product) => (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-blue-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 flex flex-col min-h-[120px] ${
                    product.stock <= 0 ? "opacity-60 grayscale" : ""
                  } dark:bg-gray-700/30`}
                  onClick={() => product.stock > 0 && addToCart(product)}
                >
                  <CardContent className="p-2 sm:p-3 text-center flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                      <p className="text-sm sm:text-lg font-bold text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
                        {typeof product.sale_price === "number" ? product.sale_price.toFixed(2) : "0.00"} ج.م
                      </p>
                    </div>
                    <div>
                      {product.category && (
                        <Badge className="text-xs mb-1 sm:mb-2 text-white px-1 sm:px-2" style={{ backgroundColor: product.category.color }}>
                          {product.category.name}
                        </Badge>
                      )}
                      <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs dark:bg-gray-600 dark:text-white px-1 sm:px-2 block">
                        {product.stock > 0 ? `متوفر: ${product.stock}` : "غير متوفر"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {totalProductPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-4 sm:mt-6 pt-4 border-t dark:border-gray-600 flex-shrink-0" dir="rtl">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((prev) => Math.max(prev - 1, 0))}
                    disabled={productPage === 0}
                    className={`transition-all duration-200 flex items-center gap-1 text-xs sm:text-sm ${
                      productPage > 0
                        ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                        : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                    السابق
                  </Button>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    الصفحة {productPage + 1} من {totalProductPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProductPage((prev) => Math.min(prev + 1, totalProductPages - 1))}
                    disabled={productPage >= totalProductPages - 1}
                    className={`transition-all duration-200 flex items-center gap-1 text-xs sm:text-sm ${
                      productPage < totalProductPages - 1
                        ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                        : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductList;