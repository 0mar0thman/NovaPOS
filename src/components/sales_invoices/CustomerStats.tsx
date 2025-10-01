import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  User,
  ShoppingBag,
  TrendingUp,
  Phone,
  Calendar,
  FileText,
  Award,
  Star,
  Crown,
  Target,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Customer } from "./SalesInvoices";

interface CustomerStatsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatsData {
  total_customers: number;
  active_customers: number;
  top_customers: Customer[];
  created_at: string;
  monthly_growth?: number;
  average_purchase?: number;
}

const CustomerStats = ({ open, onOpenChange }: CustomerStatsProps) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/api/customers/stats", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        setStats(response.data.data);
      } catch (error: any) {
        console.error("Error fetching customer stats:", error);
        toast({
          title: "خطأ",
          description:
            error.response?.data?.message || "فشل تحميل إحصائيات العملاء",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchStats();
    }
  }, [open, toast]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Award className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-orange-400" />;
      default:
        return <Star className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return "from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20 border-yellow-200";
      case 1:
        return "from-gray-100 to-gray-50 dark:from-gray-900/30 dark:to-gray-800/20 border-gray-200";
      case 2:
        return "from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 border-orange-200";
      default:
        return "from-blue-50 to-white dark:from-slate-800 dark:to-slate-700 border-blue-100";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 rounded-xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-blue-200 dark:border-slate-700">
          <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-300">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            إحصائيات العملاء
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
            نظرة شاملة على أداء العملاء وأفضل العملاء من حيث المشتريات
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                جاري تحميل الإحصائيات...
              </p>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-6 py-4">
            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                    إجمالي العملاء
                  </CardTitle>
                  <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                    {stats.total_customers}
                  </div>
                  <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                    <TrendingUp className="h-3 w-3 ml-1" />
                    قاعدة عملاء
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/10 border-green-200 dark:border-green-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300">
                    العملاء النشطين
                  </CardTitle>
                  <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                    <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 mb-1">
                    {stats.active_customers}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      النسبة
                    </span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 text-xs font-medium">
                      {stats.total_customers > 0
                        ? ((stats.active_customers / stats.total_customers) * 100).toFixed(1)
                        : 0}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
                    العملاء المميزين
                  </CardTitle>
                  <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                    {stats.top_customers.length}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    أعلى أداء
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300">
                    متوسط المشتريات
                  </CardTitle>
                  <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-full">
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                    {stats.average_purchase ? stats.average_purchase.toFixed(2) : "0.00"} ج.م
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    لكل عميل
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* مؤشر النسبة المئوية للنشاط */}
            {stats.total_customers > 0 && (
              <Card className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                    نسبة نشاط العملاء
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 dark:text-gray-400">النشطين</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {stats.active_customers} / {stats.total_customers}
                      </span>
                    </div>
                    <Progress 
                      value={(stats.active_customers / stats.total_customers) * 100} 
                      className="h-2 bg-gray-200 dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* أفضل العملاء - تصميم جديد بدون جدول */}
            <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 border-b border-blue-200 dark:border-slate-600">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-blue-900 dark:text-blue-300">
                  <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                  أفضل العملاء أداءً
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {stats.top_customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <ShoppingBag className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm sm:text-base">
                      لا يوجد عملاء مميزين حاليًا
                    </p>
                    <p className="text-xs mt-2">
                      سيظهر العملاء المميزون هنا عند توفر البيانات
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.top_customers.map((customer, index) => (
                      <div
                        key={customer.id}
                        className={`bg-gradient-to-r ${getRankColor(index)} border rounded-lg p-4 transition-all duration-200 hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-sm flex-shrink-0">
                              {getRankIcon(index)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                    {customer.name}
                                  </h3>
                                  {index < 3 && (
                                    <Badge className={`${
                                      index === 0 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                                      index === 1 ? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" :
                                      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    } text-xs py-0 px-2`}>
                                      #{index + 1}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-left sm:text-right">
                                  <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                                    {Number(customer.total_purchases).toFixed(2)} ج.م
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    إجمالي المشتريات
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{customer.phone || "لا يوجد"}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                                  <span>{customer.purchases_count} فاتورة</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" />
                                  <span>متوسط {customer.purchases_count > 0 ? (Number(customer.total_purchases) / customer.purchases_count).toFixed(2) : "0.00"} ج.م</span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {customer.updated_at
                                      ? format(new Date(customer.updated_at), "dd/MM/yyyy")
                                      : "لا توجد"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ملخص إضافي */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">إجمالي المشتريات</p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.top_customers.reduce((sum, customer) => sum + Number(customer.total_purchases), 0).toFixed(2)} ج.م
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">إجمالي الفواتير</p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.top_customers.reduce((sum, customer) => sum + customer.purchases_count, 0)}
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-700/50 rounded-lg m-4">
            <BarChart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-400 mb-2">
              لا توجد بيانات إحصائية متاحة
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500">
              قد لا توجد بيانات كافية لعرض الإحصائيات حالياً
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerStats;