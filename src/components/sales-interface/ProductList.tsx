import { useState, Dispatch, SetStateAction } from "react";
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
  role: "admin" | "user" | "manager" ; // إضافة خاصية role لتحديد نوع المستخدم
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
  product_name?: string; // Made optional to reflect potential missing data
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
  const productsPerPage = 12;
  const historyPerPage = 10;

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
    filteredProducts.length / productsPerPage
  );
  const paginatedProducts = filteredProducts.slice(
    productPage * productsPerPage,
    (productPage + 1) * productsPerPage
  );

  // Paginate sales history
  const totalHistoryPages = Math.ceil(
    searchedSalesHistory.length / historyPerPage
  );
  const paginatedSalesHistory = searchedSalesHistory.slice(
    historyPage * historyPerPage,
    (historyPage + 1) * historyPerPage
  );

return (
    <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-blue-100 dark:border-gray-700  transition-all duration-300">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-2">
                    <Search className="w-5 h-5" />
                    {showHistory ? "سجل المبيعات" : "المنتجات المتاحة"}
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200"
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
            <div className="space-y-2">
                <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={
                        showHistory
                            ? "ابحث برقم الفاتورة، رقم الهاتف، اسم المنتج أو الباركود..."
                            : "ابحث عن المنتجات..."
                    }
                    className="mt-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    disabled={isLoading}
                    dir="rtl"
                />
            </div>
        </CardHeader>
        <CardContent>
            {showHistory ? (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">آخر 10 فواتير مبيعات (خلال 14 يومًا)</h3>
                    {searchedSalesHistory.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {searchTerm ? "لم يتم العثور على فواتير مطابقة" : "لا يوجد فواتير مسجلة في آخر 14 يومًا"}
                        </p>
                    ) : (
                        <>
                            <Table dir="rtl">
                                <TableHeader>
                                    <TableRow className="dark:border-gray-700">
                                        <TableHead className="text-right dark:text-gray-300">رقم الفاتورة</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">التاريخ</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">المبلغ</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">رقم الهاتف</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">طريقة الدفع</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">الكمية المباعة</TableHead>
                                        <TableHead className="text-right dark:text-gray-300">إجراءات</TableHead>
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
                                                <TableCell className="font-medium dark:text-gray-200">{invoice.invoice_number}</TableCell>
                                                <TableCell className="dark:text-gray-300">
                                                    {format(new Date(invoice.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}
                                                </TableCell>
                                                <TableCell className="dark:text-gray-300">{Number(invoice.total_amount).toFixed(2)} ج.م</TableCell>
                                                <TableCell className="dark:text-gray-300">{invoice.phone || '-'}</TableCell>
                                                <TableCell className="dark:text-gray-300">{getPaymentMethodName(invoice.payment_method)}</TableCell>
                                                <TableCell className="dark:text-gray-300">{totalQuantity}</TableCell>
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
                                                        className="dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200"
                                                    >
                                                        <RotateCcw className="w-4 h-4 ml-1" />
                                                        استرجاع
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {totalHistoryPages > 1 && (
                                <div className="flex justify-center items-center gap-4 mt-6" dir="rtl">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 0))}
                                        disabled={historyPage === 0}
                                        className={`transition-all duration-200 flex items-center gap-1 ${
                                            historyPage > 0
                                                ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                                                : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        }`}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                        السابق
                                    </Button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        الصفحة {historyPage + 1} من {totalHistoryPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages - 1))}
                                        disabled={historyPage >= totalHistoryPages - 1}
                                        className={`transition-all duration-200 flex items-center gap-1 ${
                                            historyPage < totalHistoryPages - 1
                                                ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                                                : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                        }`}
                                    >
                                        التالي
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="border-blue-100 dark:border-gray-700 dark:bg-gray-700/30">
                            <CardContent className="p-4 space-y-3">
                                <Skeleton className="h-5 w-3/4 mx-auto dark:bg-gray-600" />
                                <Skeleton className="h-4 w-1/2 mx-auto dark:bg-gray-600" />
                                <Skeleton className="h-3 w-1/3 mx-auto dark:bg-gray-600" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {paginatedProducts.map((product) => (
                            <Card
                                key={product.id}
                                className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-blue-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 ${
                                    product.stock <= 0 ? "opacity-60 grayscale" : ""
                                } dark:bg-gray-700/30`}
                                onClick={() => product.stock > 0 && addToCart(product)}
                            >
                                <CardContent className="p-4 text-center">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{product.name}</h3>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">
                                        {typeof product.sale_price === "number" ? product.sale_price.toFixed(2) : "0.00"} ج.م
                                    </p>
                                    {product.category && (
                                        <Badge className="text-xs mb-2 text-white" style={{ backgroundColor: product.category.color }}>
                                            {product.category.name}
                                        </Badge>
                                    )}
                                    <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-xs dark:bg-gray-600 dark:text-white">
                                        {product.stock > 0 ? `متوفر: ${product.stock}` : "غير متوفر"}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {totalProductPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-6" dir="rtl">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setProductPage((prev) => Math.max(prev - 1, 0))}
                                disabled={productPage === 0}
                                className={`transition-all duration-200 flex items-center gap-1 ${
                                    productPage > 0
                                        ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                                        : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                <ChevronRight className="w-4 h-4" />
                                السابق
                            </Button>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                الصفحة {productPage + 1} من {totalProductPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setProductPage((prev) => Math.min(prev + 1, totalProductPages - 1))}
                                disabled={productPage >= totalProductPages - 1}
                                className={`transition-all duration-200 flex items-center gap-1 ${
                                    productPage < totalProductPages - 1
                                        ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700"
                                        : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                }`}
                            >
                                التالي
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </CardContent>
    </Card>
);
};

export default ProductList;