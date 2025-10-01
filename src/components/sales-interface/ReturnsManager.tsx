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
  ChevronsLeft,
  MoreVertical
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isMobile, setIsMobile] = useState(false);

  // الكشف عن حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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

  // معالج النقر على كارد الإحصائيات
  const handleStatCardClick = (statType: string) => {
    setActiveTab(statType === "total" ? "all" : statType);
  };

  // عرض الجدول على الشاشات الصغيرة
  const renderMobileInvoiceCard = (invoice: SaleInvoice) => {
    const totalQuantity = invoice.items.reduce(
      (sum, item) => sum + (item.quantity - (item.returned_quantity || 0)),
      0
    );
    const canReturn = invoice.items.some(
      (item) => item.quantity > (item.returned_quantity || 0)
    );
    const amountAfterReturn = calculateAmountAfterReturn(invoice);

    return (
      <Card key={invoice.id} className="mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              {getReturnStatusIcon(invoice)}
              {getReturnStatusBadge(invoice)}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">رقم الفاتورة:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">التاريخ:</span>
              <span className="text-sm">
                {format(new Date(invoice.created_at), "yyyy/MM/dd HH:mm", { locale: ar })}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">العميل:</span>
              <span className="text-sm">
                {invoice.customer_name || "غير محدد"}
                {invoice.phone ? ` (${invoice.phone})` : ""}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">المبلغ الأصلي:</span>
              <span className="text-sm">{Number(invoice.total_amount).toFixed(2)} ج.م</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">المبلغ بعد الاسترجاع:</span>
              <span className="text-sm">{Number(amountAfterReturn).toFixed(2)} ج.م</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">طريقة الدفع:</span>
              <span className="text-sm">{getPaymentMethodName(invoice.payment_method)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">الكمية المباعة:</span>
              <span className="text-sm">{totalQuantity}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">الكاشير:</span>
              <span className="text-sm">{invoice.cashier.name}</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setupReturn(invoice)}
              disabled={!canReturn}
              className="w-full flex items-center justify-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              استرجاع
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              إدارة عمليات الاسترجاع
            </CardTitle>
            <CardDescription>
              نظام متكامل لإدارة وتتبع عمليات استرجاع الفواتير
            </CardDescription>
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
        <div className="flex gap-2 justify-between w-full md:w-auto">
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
              <span>تصدير CSV</span>
            </Button>
          </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* إحصائيات سريعة - قابلة للنقر */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card 
            className={`bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeTab === "all" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleStatCardClick("total")}
          >
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

          <Card 
            className={`bg-green-50 dark:bg-green-950/20 cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeTab === "nonReturned" ? "ring-2 ring-green-500" : ""
            }`}
            onClick={() => handleStatCardClick("nonReturned")}
          >
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

          <Card 
            className={`bg-yellow-50 dark:bg-yellow-950/20 cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeTab === "partiallyReturned" ? "ring-2 ring-yellow-500" : ""
            }`}
            onClick={() => handleStatCardClick("partiallyReturned")}
          >
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

          <Card 
            className={`bg-red-50 dark:bg-red-950/20 cursor-pointer transition-all duration-200 hover:shadow-md ${
              activeTab === "fullyReturned" ? "ring-2 ring-red-500" : ""
            }`}
            onClick={() => handleStatCardClick("fullyReturned")}
          >
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

        {/* عرض الفواتير المصفاة مباشرة بدون ألسنة تبويب */}
        <div className="mt-6">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <BarChart3 className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-lg font-medium">لا توجد فواتير تطابق معايير البحث</p>
                <p className="text-sm max-w-md">
                  حاول تعديل معايير البحث أو تغيير عوامل التصفية للعثور على الفواتير المطلوبة
                </p>
              </div>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {paginatedInvoices.map(renderMobileInvoiceCard)}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
              <div className="overflow-x-auto">
                <Table
                  className="
                    min-w-full
                    [&_th]:px-4 [&_th]:py-3 [&_th]:text-sm [&_th]:font-semibold
                    [&_th]:text-foreground/80 [&_th]:bg-muted/30
                    [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_td]:align-middle
                  "
                >
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="min-w-[120px] text-center hidden sm:table-cell">
                        حالة الاسترجاع
                      </TableHead>
                      <TableHead className="min-w-[100px] text-center">
                        رقم الفاتورة
                      </TableHead>
                      <TableHead className="min-w-[140px] text-center hidden md:table-cell">
                        التاريخ
                      </TableHead>
                      <TableHead className="min-w-[150px] text-center hidden lg:table-cell">
                        العميل
                      </TableHead>
                      <TableHead className="min-w-[120px] text-center hidden xl:table-cell">
                        المبلغ الأصلي
                      </TableHead>
                      <TableHead className="min-w-[120px] text-center">
                        المبلغ بعد الاسترجاع
                      </TableHead>
                      <TableHead className="min-w-[100px] text-center hidden lg:table-cell">
                        طريقة الدفع
                      </TableHead>
                      <TableHead className="min-w-[80px] text-center hidden md:table-cell">
                        الكمية
                      </TableHead>
                      <TableHead className="min-w-[120px] text-center hidden xl:table-cell">
                        الكاشير
                      </TableHead>
                      <TableHead className="min-w-[100px] text-center">
                        الإجراءات
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const totalQuantity = invoice.items.reduce(
                        (sum, item) => sum + (item.quantity - (item.returned_quantity || 0)),
                        0
                      );

                      const canReturn = invoice.items.some(
                        (item) => item.quantity > (item.returned_quantity || 0)
                      );

                      const amountAfterReturn = calculateAmountAfterReturn(invoice);

                      return (
                        <TableRow
                          key={invoice.id}
                          className="
                            hover:bg-muted/20
                            transition-colors border-b last:border-b-0
                          "
                        >
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex items-center gap-2 justify-center">
                              {getReturnStatusIcon(invoice)}
                              {getReturnStatusBadge(invoice)}
                            </div>
                          </TableCell>

                          <TableCell className="font-medium text-center text-foreground">
                            {invoice.invoice_number}
                          </TableCell>

                          <TableCell className="text-center hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {format(new Date(invoice.created_at), "yyyy/MM/dd", { locale: ar })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(invoice.created_at), "HH:mm", { locale: ar })}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center hidden lg:table-cell">
                            <div className="flex flex-col items-center">
                              <span className="font-medium">
                                {invoice.customer_name || "غير محدد"}
                              </span>
                              {invoice.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {invoice.phone}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-center hidden xl:table-cell">
                            <span className="text-sm font-medium">
                              {Number(invoice.total_amount).toFixed(2)} ج.م
                            </span>
                          </TableCell>

                          <TableCell className="text-center font-semibold">
                            <span
                              className={`
                                text-sm
                                ${amountAfterReturn < invoice.total_amount
                                  ? "text-orange-600 dark:text-orange-400"
                                  : "text-foreground"}
                              `}
                            >
                              {Number(amountAfterReturn).toFixed(2)} ج.م
                            </span>
                          </TableCell>

                          <TableCell className="text-center hidden lg:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {getPaymentMethodName(invoice.payment_method)}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center hidden md:table-cell">
                            <span className="font-medium">{totalQuantity}</span>
                          </TableCell>

                          <TableCell className="text-center hidden xl:table-cell">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">
                                {invoice.cashier.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {invoice.cashier.role}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              variant={canReturn ? "default" : "outline"}
                              size="sm"
                              onClick={() => setupReturn(invoice)}
                              disabled={!canReturn}
                              className="
                                flex items-center gap-1 min-w-[80px]
                                transition-all duration-200 hover:scale-105
                              "
                            >
                              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">استرجاع</span>
                              <span className="sm:hidden">رجوع</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

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
              
              {/* عرض أرقام الصفحات بشكل متجاوب */}
              <div className="flex items-center gap-1">
                {(() => {
                  // تحديد الصفحات المراد عرضها (للتحكم في العرض على الشاشات الصغيرة)
                  let pagesToShow: number[] = [];
                  
                  if (totalPages <= 5) {
                    // إذا كان العدد الإجمالي للصفحات 5 أو أقل، عرض جميع الصفحات
                    pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1);
                  } else {
                    // إذا كان العدد الإجمالي للصفحات أكثر من 5، عرض مجموعة محددة
                    if (currentPage <= 3) {
                      pagesToShow = [1, 2, 3, 4, 5];
                    } else if (currentPage >= totalPages - 2) {
                      pagesToShow = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    } else {
                      pagesToShow = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
                    }
                  }
                  
                  return pagesToShow.map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-8 h-8 sm:w-10 sm:h-10"
                    >
                      {page}
                    </Button>
                  ));
                })()}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p>
                عرض <strong>{paginatedInvoices.length}</strong> من أصل{" "}
                <strong>{filteredInvoices.length}</strong> فاتورة (إجمالي:{" "}
                <strong>{salesHistory.length}</strong>)
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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