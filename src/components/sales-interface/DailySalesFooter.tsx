import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Undo2, ShoppingBag, FileText, Package, Loader2, Calendar, User, Receipt } from "lucide-react";

interface DailySalesFooterProps {
  currentUser: { id: number; name: string } | null;
  saleTrigger?: number;
  returnTrigger?: number;
}

const DailySalesFooter = ({ currentUser, saleTrigger = 0, returnTrigger = 0 }: DailySalesFooterProps) => {
  const [dailyData, setDailyData] = useState({
    total: 0,
    invoiceCount: 0,
    itemCount: 0,
    invoices: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch daily sales for the logged-in user only
  const fetchDailySales = async () => {
    if (!currentUser?.id) {
      // If no user is logged in, reset data to avoid showing incorrect totals
      setDailyData({
        total: 0,
        invoiceCount: 0,
        itemCount: 0,
        invoices: [],
      });
      return;
    }

    try {
      setIsLoading(true);

      // Fetch invoices specific to the logged-in user
      const response = await api.get("/api/sales-invoices", {
        params: {
          user_id: currentUser.id, // Ensure only the current user's invoices are fetched
          status: "paid",
          include: "items",
          order_by: "created_at",
          order_direction: "desc",
        },
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });

      const start = startOfDay(new Date());
      const end = endOfDay(new Date());

      // Process invoices for the current day and logged-in user
      const { filteredInvoices, total, totalItems } = processInvoices(response.data, start, end);

      setDailyData({
        total,
        invoiceCount: filteredInvoices.length,
        itemCount: totalItems,
        invoices: filteredInvoices,
      });
    } catch (error: any) {
      console.error("Error fetching daily sales for user:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل إجمالي المبيعات اليومية للمستخدم",
        variant: "destructive",
      });
      setDailyData({
        total: 0,
        invoiceCount: 0,
        itemCount: 0,
        invoices: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Process invoices to compute user-specific totals, invoice count, and item count
  const processInvoices = (invoices: any[], start: Date, end: Date) => {
    // Filter invoices by date (within the current day)
    const filteredInvoices = invoices
      .filter((invoice) => {
        const invoiceDate = new Date(invoice.created_at);
        return invoiceDate >= start && invoiceDate <= end && invoice.user_id === currentUser?.id;
      })
      .map((invoice) => {
        const totalItems = invoice.items.reduce(
          (sum: number, item: any) => sum + (Number(item.quantity) || 0),
          0
        );
        const totalReturnedItems = invoice.items.reduce(
          (sum: number, item: any) => sum + (Number(item.returned_quantity) || 0),
          0
        );
        const hasReturns = totalReturnedItems > 0;
        const returnStatus = hasReturns
          ? totalReturnedItems === totalItems
            ? "full"
            : "partial"
          : null;

        return {
          ...invoice,
          hasReturns,
          totalReturnedItems,
          totalItems,
          returnStatus,
        };
      });

    // Calculate total sales for the user (excluding returned items)
    const total = filteredInvoices.reduce((sum: number, invoice: any) => {
      const invoiceTotal = invoice.items.reduce((itemSum: number, item: any) => {
        const effectiveQuantity = Number(item.quantity) - (Number(item.returned_quantity) || 0);
        return itemSum + Number(item.unit_price) * effectiveQuantity;
      }, 0);
      return sum + invoiceTotal;
    }, 0);

    // Calculate total items sold (excluding returned items)
    const totalItems = filteredInvoices.reduce((sum: number, invoice: any) => {
      return (
        sum +
        invoice.items.reduce(
          (qty: number, item: any) =>
            qty + (Number(item.quantity) - (Number(item.returned_quantity) || 0)),
          0
        )
      );
    }, 0);

    return { filteredInvoices, total, totalItems };
  };

  // Fetch sales data when user changes or triggers update
  useEffect(() => {
    fetchDailySales();
  }, [currentUser, saleTrigger, returnTrigger]);

  // Reset totals at midnight
  useEffect(() => {
    const now = new Date();
    const timeToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setDailyData({
        total: 0,
        invoiceCount: 0,
        itemCount: 0,
        invoices: [],
      });
      fetchDailySales();
    }, timeToMidnight);

    return () => clearTimeout(timeout);
  }, [currentUser]);

  const getReturnStatusColor = (returnStatus: string | null) => {
    switch (returnStatus) {
      case "full":
        return "text-red-600 dark:text-red-400 border-red-300 dark:border-red-500";
      case "partial":
        return "text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500";
      default:
        return "";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 
                bg-white/80 dark:bg-slate-800/90 
                backdrop-blur-sm 
                border-t border-gray-200 dark:border-gray-700 
                shadow-xl z-50  transition-all duration-300">

      <div className="container mx-auto px-4 py-1">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          {/* الجزء الأيسر: ملخص المبيعات */}
          <div className="flex items-center gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl 
                    text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500
                    hover:bg-blue-50 dark:hover:bg-slate-700 hover:shadow-md
                    font-semibold transition-all duration-300 ease-in-out"
                  disabled={isLoading || !currentUser}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>التفاصيل</span>
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden flex flex-col bg-white/95 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 rounded-2xl shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    تقرير المبيعات اليومي لـ {currentUser?.name || "المستخدم"}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4 py-4">
                  {dailyData.invoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">
                        لا توجد فواتير لهذا اليوم
                      </p>
                      <p className="text-sm mt-2">
                        ستظهر الفواتير هنا بعد إتمام عمليات البيع
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...dailyData.invoices]
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .map((invoice) => (
                          <Card
                            key={invoice.id}
                            className={`border-blue-200 dark:border-slate-600 dark:bg-slate-900/100 hover:shadow-md dark:hover:shadow-slate-700 transition-all duration-200 ${
                              invoice.hasReturns
                                ? invoice.returnStatus === "full"
                                  ? "border-red-200 dark:border-red-800"
                                  : "border-yellow-200 dark:border-yellow-800"
                                : "border-blue-200 dark:border-blue-600"
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500"
                                    >
                                      {invoice.invoice_number}
                                    </Badge>
                                    {invoice.hasReturns && (
                                      <Badge
                                        variant="outline"
                                        className={getReturnStatusColor(
                                          invoice.returnStatus
                                        )}
                                      >
                                        <Undo2 className="w-4 h-4 ml-1" />
                                        {invoice.returnStatus === "full"
                                          ? `مسترجع بالكامل`
                                          : `مسترجع جزئيًا (${invoice.totalReturnedItems}/${invoice.totalItems})`}
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500 flex items-center gap-1"
                                    >
                                      <Package className="w-4 h-4" />
                                      {invoice.totalItems} منتج
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                      {format(
                                        new Date(invoice.created_at),
                                        "dd/MM/yyyy - HH:mm"
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                      {currentUser?.name || "غير معروف"}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {Number(invoice.total_amount).toFixed(2)}{" "}
                                    ج.م
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    طريقة الدفع: <span className="font-bold">{invoice.payment_method === "cash" ? "نقدي" : invoice.payment_method === "vodafone_cash" ? "فودافون كاش" : "انستا باي"}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              البائع:{" "}
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {currentUser?.name || "غير معروف"}
              </span>
            </div>
          </div>

          {/* الجزء الأيمن: اسم المستخدم وزر التفاصيل */}
          <div className="flex items-center gap-3">
            <StatCard
              icon={<ShoppingBag className="w-5 h-5" />}
              title="الإجمالي"
              value={`${dailyData.total.toFixed(2)} ج.م`}
              loading={isLoading}
            />
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              title="الفواتير"
              value={dailyData.invoiceCount.toString()}
              loading={isLoading}
            />
            <StatCard
              icon={<Package className="w-5 h-5" />}
              title="المنتجات"
              value={dailyData.itemCount.toString()}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// مكونات مساعدة
const StatCard = ({
  icon,
  title,
  value,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  loading: boolean;
}) => (
  <div className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 bg-opacity-80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 min-w-[100px]">
    <div className="text-blue-600 dark:text-blue-400">{icon}</div>
    <div>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</div>
      <div className="text-base text-gray-900 dark:text-white font-bold">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
    </div>
  </div>
);

export default DailySalesFooter;