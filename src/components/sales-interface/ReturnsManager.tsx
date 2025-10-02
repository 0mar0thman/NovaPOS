import { useState, useEffect, SetStateAction, Dispatch } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  BarChart3,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";

interface SaleInvoice {
  id: string;
  invoice_number: string;
  date: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
  phone?: string;
  customer_name?: string;
  items: SaleItem[];
  cashier_id: number;
  cashier: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
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

interface ReturnStats {
  total: number;
  nonReturned: number;
  partiallyReturned: number;
  fullyReturned: number;
}

interface ReturnManagerProps {
  salesHistory: SaleInvoice[];
  setSelectedInvoice: Dispatch<SetStateAction<SaleInvoice | null>>;
  setReturnItems: (items: { [key: string]: number }) => void;
  setReturnDialogOpen: (open: boolean) => void;
  getPaymentMethodName: (method: string) => string;
  onExportData: (type: string, filteredInvoices: SaleInvoice[], filters: any) => void;
}

const ReturnManager = ({
  salesHistory,
  setSelectedInvoice,
  setReturnItems,
  setReturnDialogOpen,
  getPaymentMethodName,
  onExportData,
}: ReturnManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "7days" | "30days">("30days");
  const [filteredInvoices, setFilteredInvoices] = useState<SaleInvoice[]>([]);
  const [returnStats, setReturnStats] = useState<ReturnStats>({
    total: 0,
    nonReturned: 0,
    partiallyReturned: 0,
    fullyReturned: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // تصنيف الفواتير حسب حالة الاسترجاع
  const classifyInvoice = (invoice: SaleInvoice): "nonReturned" | "partiallyReturned" | "fullyReturned" => {
    const hasReturns = invoice.items.some(item => item.returned_quantity > 0);
    const allReturned = invoice.items.every(item => item.returned_quantity >= item.quantity);
    
    if (!hasReturns) return "nonReturned";
    if (allReturned) return "fullyReturned";
    return "partiallyReturned";
  };

  // حساب المبلغ بعد الاسترجاع
  const calculateAmountAfterReturn = (invoice: SaleInvoice): number => {
    return invoice.items.reduce((total, item) => {
      const remainingQuantity = item.quantity - (item.returned_quantity || 0);
      return total + (remainingQuantity * item.unit_price);
    }, 0);
  };

  // حساب إحصائيات الاسترجاع
  const calculateStats = (invoices: SaleInvoice[]) => {
    const stats = {
      total: invoices.length,
      nonReturned: 0,
      partiallyReturned: 0,
      fullyReturned: 0,
    };

    invoices.forEach(invoice => {
      const classification = classifyInvoice(invoice);
      stats[classification] += 1;
    });

    return stats;
  };

  // تصفية الفواتير بناء على البحث والتاريخ
  useEffect(() => {
    let filtered = [...salesHistory];
    
    // تطبيق تصفية التاريخ
    const now = new Date();
    if (dateFilter !== "all") {
      if (dateFilter === "today") {
        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at);
          return invoiceDate >= startOfDay(now) && invoiceDate <= endOfDay(now);
        });
      } else if (dateFilter === "yesterday") {
        const yesterday = subDays(now, 1);
        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.created_at);
          return invoiceDate >= startOfDay(yesterday) && invoiceDate <= endOfDay(yesterday);
        });
      } else {
        const days = dateFilter === "7days" ? 7 : 30;
        const startDate = subDays(now, days);
        filtered = filtered.filter(invoice => new Date(invoice.created_at) >= startDate);
      }
    }
    
    // تطبيق البحث
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(term) ||
        (invoice.phone && invoice.phone.toLowerCase().includes(term)) ||
        (invoice.customer_name && invoice.customer_name.toLowerCase().includes(term)) ||
        invoice.items.some(item => 
          (item.product_name || "").toLowerCase().includes(term) ||
          (item.product?.name || "").toLowerCase().includes(term) ||
          (item.product?.barcode || "").toLowerCase().includes(term)
        )
      );
    }
    
    // تطبيق تصفية حالة الاسترجاع
    if (activeTab !== "all") {
      filtered = filtered.filter(invoice => {
        const classification = classifyInvoice(invoice);
        return classification === activeTab;
      });
    }
    
    setFilteredInvoices(filtered);
    setReturnStats(calculateStats(filtered));
    setCurrentPage(1); // إعادة تعيين الصفحة إلى 1 عند تغيير التصفية
  }, [salesHistory, searchTerm, activeTab, dateFilter]);

  // حساب الصفحات وتقسيم الفواتير
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // التنقل بين الصفحات
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  // إعداد عملية الاسترجاع
  const setupReturn = (invoice: SaleInvoice) => {
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
  };

  // الحصول على لون البادج حسب حالة الاسترجاع
  const getReturnStatusBadge = (invoice: SaleInvoice) => {
    const status = classifyInvoice(invoice);
    
    switch (status) {
      case "nonReturned":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">غير مسترجعة</Badge>;
      case "partiallyReturned":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300">مسترجعة جزئياً</Badge>;
      case "fullyReturned":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300">مسترجعة كلياً</Badge>;
      default:
        return null;
    }
  };

  // الحصول على أيقونة حالة الاسترجاع
  const getReturnStatusIcon = (invoice: SaleInvoice) => {
    const status = classifyInvoice(invoice);
    
    switch (status) {
      case "nonReturned":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partiallyReturned":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "fullyReturned":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              إدارة عمليات الاسترجاع
            </CardTitle>
            <CardDescription>
              نظام متكامل لإدارة وتتبع عمليات استرجاع الفواتير
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onExportData("csv", filteredInvoices, {
                  searchTerm,
                  dateFilter,
                })
              }
              className="bg-blue-600 text-white hover:text-gray-100 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-gray-200"
            >
              <Download className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم الفاتورة، الهاتف، اسم العميل، أو اسم المنتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="p-2 border rounded-md text-sm text-dark bg-transparent dark:bg-muted/80 dark:text-white dark:border-secondary dark:hover:bg-secondary dark:hover:text-white dark:focus:bg-secondary dark:focus:text-white dark:focus:ring-secondary dark:ring-offset-secondary"
            >
              <option value="all">كل الفترات</option>
              <option value="today">اليوم حتى الآن</option>
              <option value="yesterday">اليوم السابق</option>
              <option value="7days">آخر 7 أيام</option>
              <option value="30days">آخر 30 يوم</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">إجمالي الفواتير</p>
                  <h3 className="text-2xl font-bold">{returnStats.total}</h3>
                </div>
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">غير مسترجعة</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    {returnStats.nonReturned}
                  </h3>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">مسترجعة جزئياً</p>
                  <h3 className="text-2xl font-bold text-yellow-600">
                    {returnStats.partiallyReturned}
                  </h3>
                </div>
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">مسترجعة كلياً</p>
                  <h3 className="text-2xl font-bold text-red-600">
                    {returnStats.fullyReturned}
                  </h3>
                </div>
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ألسنة التبويب */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              الكل
            </TabsTrigger>
            <TabsTrigger
              value="nonReturned"
              className="flex items-center gap-1"
            >
              <CheckCircle className="h-4 w-4" />
              غير مسترجعة
            </TabsTrigger>
            <TabsTrigger
              value="partiallyReturned"
              className="flex items-center gap-1"
            >
              <AlertCircle className="h-4 w-4" />
              جزئياً
            </TabsTrigger>
            <TabsTrigger
              value="fullyReturned"
              className="flex items-center gap-1"
            >
              <XCircle className="h-4 w-4" />
              كلياً
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {paginatedInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد فواتير تطابق معايير البحث</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>حالة الاسترجاع</TableHead>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>المبلغ قبل الاسترجاع</TableHead>
                      <TableHead>المبلغ بعد الاسترجاع</TableHead>
                      <TableHead>طريقة الدفع</TableHead>
                      <TableHead>الكمية المباعة</TableHead>
                      <TableHead>الكاشير</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const totalQuantity = invoice.items.reduce(
                        (sum, item) =>
                          sum + (item.quantity - (item.returned_quantity || 0)),
                        0
                      );
                      const canReturn = invoice.items.some(
                        (item) => item.quantity > (item.returned_quantity || 0)
                      );
                      const amountAfterReturn =
                        calculateAmountAfterReturn(invoice);

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getReturnStatusIcon(invoice)}
                              {getReturnStatusBadge(invoice)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(invoice.created_at),
                              "yyyy/MM/dd HH:mm",
                              { locale: ar }
                            )}
                          </TableCell>
                          <TableCell>
                            {invoice.customer_name || "غير محدد"}{" "}
                            {invoice.phone ? `(${invoice.phone})` : ""}
                          </TableCell>
                          <TableCell>
                            {Number(invoice.total_amount).toFixed(2)} ج.م
                          </TableCell>
                          <TableCell>
                            {Number(amountAfterReturn).toFixed(2)} ج.م
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodName(invoice.payment_method)}
                          </TableCell>
                          <TableCell>{totalQuantity}</TableCell>
                          <TableCell>{invoice.cashier.name}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setupReturn(invoice)}
                              disabled={!canReturn}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw className="h-4 w-4" />
                              استرجاع
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* واجهة الباجينيشن */}
        {filteredInvoices.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">عرض</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="p-2 border rounded-md text-sm text-dark bg-transparent dark:bg-muted/80 dark:text-white dark:border-secondary dark:hover:bg-secondary dark:hover:text-white dark:focus:bg-secondary dark:focus:text-white dark:focus:ring-secondary dark:ring-offset-secondary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-muted-foreground">
                فواتير لكل صفحة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-10 h-10"
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ملخص النتائج */}
        {filteredInvoices.length > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-md text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                عرض <strong>{paginatedInvoices.length}</strong> من أصل{" "}
                <strong>{filteredInvoices.length}</strong> فاتورة (إجمالي:{" "}
                <strong>{salesHistory.length}</strong>)
              </p>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>غير مسترجعة: {returnStats.nonReturned}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>جزئياً: {returnStats.partiallyReturned}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>كلياً: {returnStats.fullyReturned}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReturnManager;