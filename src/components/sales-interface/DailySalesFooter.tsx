import { useState, useEffect, useCallback } from "react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, endOfDay, isToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Undo2,
  ShoppingBag,
  FileText,
  Package,
  Loader2,
  Calendar,
  User,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/components/dashboard/UserContext";

interface DailySalesFooterProps {
  saleTrigger?: number;
  returnTrigger?: number;
  onNewSale?: (saleData: any) => void;
  onNewReturn?: (returnData: any) => void;
}

const DailySalesFooter = ({
  saleTrigger = 0,
  returnTrigger = 0,
  onNewSale,
  onNewReturn,
}: DailySalesFooterProps) => {
  const { currentUser } = useUser();
  const [dailyData, setDailyData] = useState({
    total: 0,
    invoiceCount: 0,
    itemCount: 0,
    invoices: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  // استخدام useCallback لمنع إعادة إنشاء الدالة في كل render
  const fetchDailySales = useCallback(async () => {
    if (!currentUser?.id) {
      console.log("No user logged in");
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

      const response = await api.get("/api/sales-invoices", {
        params: {
          user_id: currentUser.id,
          status: "paid",
          include: "items",
          order_by: "created_at",
          order_direction: "desc",
          // إضافة timestamp لمنع التخزين المؤقت
          _t: new Date().getTime(),
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Cache-Control": "no-cache",
        },
      });

      // معالجة مختلف أشكال الاستجابة
      const invoicesData = Array.isArray(response.data)
        ? response.data
        : response.data?.invoices
        ? response.data.invoices
        : response.data?.data
        ? response.data.data
        : [];

      const start = startOfDay(new Date());
      const end = endOfDay(new Date());

      const { filteredInvoices, total, totalItems } = processInvoices(
        invoicesData,
        start,
        end
      );

      setDailyData({
        total,
        invoiceCount: filteredInvoices.length,
        itemCount: totalItems,
        invoices: filteredInvoices,
      });

      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("Error fetching daily sales:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل إجمالي المبيعات اليومية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  // معالجة الفواتير بشكل أكثر كفاءة
  const processInvoices = (invoices: any[], start: Date, end: Date) => {
    if (!invoices || !Array.isArray(invoices)) {
      return { filteredInvoices: [], total: 0, totalItems: 0 };
    }

    const filteredInvoices = invoices
      .filter((invoice) => {
        if (!invoice.created_at || !invoice.user_id) return false;

        const invoiceDate = new Date(invoice.created_at);
        return isToday(invoiceDate) && invoice.user_id === currentUser?.id;
      })
      .map((invoice) => {
        const items = invoice.items || [];
        const totalItems = items.reduce(
          (sum: number, item: any) => sum + (Number(item.quantity) || 0),
          0
        );
        const totalReturnedItems = items.reduce(
          (sum: number, item: any) =>
            sum + (Number(item.returned_quantity) || 0),
          0
        );

        return {
          ...invoice,
          items,
          hasReturns: totalReturnedItems > 0,
          totalReturnedItems,
          totalItems,
          returnStatus:
            totalReturnedItems > 0
              ? totalReturnedItems === totalItems
                ? "full"
                : "partial"
              : null,
        };
      });

    // حساب الإجماليات بشكل أكثر كفاءة
    const { total, totalItems: itemsCount } = filteredInvoices.reduce(
      (acc, invoice) => {
        const invoiceResult = (invoice.items || []).reduce(
          (itemAcc: any, item: any) => {
            const quantity = Number(item.quantity) || 0;
            const returned = Number(item.returned_quantity) || 0;
            const effectiveQuantity = Math.max(0, quantity - returned);
            const unitPrice = Number(item.unit_price) || 0;

            return {
              total: itemAcc.total + unitPrice * effectiveQuantity,
              items: itemAcc.items + effectiveQuantity,
            };
          },
          { total: 0, items: 0 }
        );

        return {
          total: acc.total + invoiceResult.total,
          totalItems: acc.totalItems + invoiceResult.items,
        };
      },
      { total: 0, totalItems: 0 }
    );

    return { filteredInvoices, total, totalItems: itemsCount };
  };

  // تحديث فوري عند حدوث بيع جديد
  const handleNewSale = useCallback(
    (saleData: any) => {
      if (saleData && currentUser?.id === saleData.user_id) {
        setDailyData((prev) => {
          const newInvoice = {
            ...saleData,
            items: saleData.items || [],
            hasReturns: false,
            totalReturnedItems: 0,
            totalItems:
              saleData.items?.reduce(
                (sum: number, item: any) => sum + (Number(item.quantity) || 0),
                0
              ) || 0,
            returnStatus: null,
          };

          const newTotal = prev.total + (Number(saleData.total_amount) || 0);
          const newItemCount = prev.itemCount + (newInvoice.totalItems || 0);

          return {
            total: newTotal,
            invoiceCount: prev.invoiceCount + 1,
            itemCount: newItemCount,
            invoices: [newInvoice, ...prev.invoices],
          };
        });

        setLastUpdate(new Date());
        toast({
          title: "تم تحديث المبيعات",
          description: "تم إضافة البيع الجديد إلى الإحصائيات",
          variant: "default",
        });
      }
    },
    [currentUser, toast]
  );

  // تحديث فوري عند حدوث إرجاع
  const handleNewReturn = useCallback(
    (returnData: any) => {
      if (returnData && returnData.invoice_id) {
        setDailyData((prev) => {
          const updatedInvoices = prev.invoices.map((invoice) => {
            if (invoice.id === returnData.invoice_id) {
              const updatedItems = invoice.items.map((item: any) => {
                if (item.id === returnData.item_id) {
                  const newReturnedQty =
                    (Number(item.returned_quantity) || 0) +
                    (Number(returnData.quantity) || 0);
                  return { ...item, returned_quantity: newReturnedQty };
                }
                return item;
              });

              const totalItems = updatedItems.reduce(
                (sum: number, item: any) => sum + (Number(item.quantity) || 0),
                0
              );
              const totalReturnedItems = updatedItems.reduce(
                (sum: number, item: any) =>
                  sum + (Number(item.returned_quantity) || 0),
                0
              );

              return {
                ...invoice,
                items: updatedItems,
                hasReturns: totalReturnedItems > 0,
                totalReturnedItems,
                totalItems,
                returnStatus:
                  totalReturnedItems > 0
                    ? totalReturnedItems === totalItems
                      ? "full"
                      : "partial"
                    : null,
              };
            }
            return invoice;
          });

          // إعادة حساب الإجماليات
          const { total, totalItems } = updatedInvoices.reduce(
            (acc, invoice) => {
              const invoiceResult = (invoice.items || []).reduce(
                (itemAcc: any, item: any) => {
                  const quantity = Number(item.quantity) || 0;
                  const returned = Number(item.returned_quantity) || 0;
                  const effectiveQuantity = Math.max(0, quantity - returned);
                  const unitPrice = Number(item.unit_price) || 0;

                  return {
                    total: itemAcc.total + unitPrice * effectiveQuantity,
                    items: itemAcc.items + effectiveQuantity,
                  };
                },
                { total: 0, items: 0 }
              );

              return {
                total: acc.total + invoiceResult.total,
                totalItems: acc.totalItems + invoiceResult.items,
              };
            },
            { total: 0, totalItems: 0 }
          );

          return {
            total,
            invoiceCount: prev.invoiceCount,
            itemCount: totalItems,
            invoices: updatedInvoices,
          };
        });

        setLastUpdate(new Date());
        toast({
          title: "تم تحديث المرتجعات",
          description: "تم تحديث الإحصائيات بعد عملية الإرجاع",
          variant: "default",
        });
      }
    },
    [toast]
  );

  // الاستماع للأحداث الخارجية (بيع جديد، إرجاع جديد)
  useEffect(() => {
    if (onNewSale) {
      onNewSale(handleNewSale);
    }
    if (onNewReturn) {
      onNewReturn(handleNewReturn);
    }
  }, [onNewSale, onNewReturn, handleNewSale, handleNewReturn]);

  // التحديث عند تغيير المستخدم أو triggers
  useEffect(() => {
    fetchDailySales();
  }, [fetchDailySales, saleTrigger, returnTrigger]);

  // Reset at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeToMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setDailyData({
        total: 0,
        invoiceCount: 0,
        itemCount: 0,
        invoices: [],
      });
      // إعادة التحميل بعد منتصف الليل
      setTimeout(() => fetchDailySales(), 1000);
    }, timeToMidnight);

    return () => clearTimeout(timeout);
  }, [fetchDailySales]);

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

  // تحديث يدوي
  const handleManualRefresh = () => {
    fetchDailySales();
    toast({
      title: "جاري التحديث",
      description: "يتم تحديث البيانات الآن...",
    });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 
                bg-white/80 dark:bg-slate-800/90 
                backdrop-blur-sm 
                border-t border-gray-200 dark:border-gray-700 
                shadow-xl z-50 transition-all duration-300"
    >
      <div className="container mx-auto px-4 py-1">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          {/* الجزء الأيسر: معلومات المستخدم والتفاصيل */}
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
                      <FileText className="w-5 h-5" />
                      <span>التفاصيل</span>
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden flex flex-col bg-white/95 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 rounded-2xl shadow-2xl">
                <DialogHeader className="flex flex-row items-center justify-between">
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    تقرير المبيعات اليومي لـ {currentUser?.name || "المستخدم"}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualRefresh}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
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
                      {dailyData.invoices.map((invoice) => (
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
                                  {Number(invoice.total_amount).toFixed(2)} ج.م
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  طريقة الدفع:{" "}
                                  <span className="font-bold">
                                    {invoice.payment_method === "cash"
                                      ? "نقدي"
                                      : invoice.payment_method ===
                                        "vodafone_cash"
                                      ? "فودافون كاش"
                                      : invoice.payment_method === "instapay"
                                      ? "انستا باي"
                                      : invoice.payment_method}
                                  </span>
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

            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                البائع:{" "}
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {currentUser?.name || "غير معروف"}
                </span>
              </div>
            </div>
          </div>

          {/* الجزء الأيمن: إحصائيات المبيعات */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>

            <StatCard
              icon={<ShoppingBag className="w-5 h-5" />}
              title="الإجمالي"
              value={`${dailyData.total.toFixed(2)}`}
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
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {title}
      </div>
      <div className="text-base text-gray-900 dark:text-white font-bold">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : value}
      </div>
    </div>
  </div>
);

export default DailySalesFooter;
