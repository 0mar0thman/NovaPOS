
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, User, ShoppingBag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          description: error.response?.data?.message || "فشل تحميل إحصائيات العملاء",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
            <BarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            إحصائيات العملاء
          </DialogTitle>
          <DialogDescription>
            عرض إحصائيات إجمالي العملاء والعملاء النشطين وأعلى العملاء.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-blue-50 dark:bg-slate-700/50 border-blue-200 dark:border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    إجمالي العملاء
                  </CardTitle>
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{stats.total_customers}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-slate-700/50 border-blue-200 dark:border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    العملاء النشطين
                  </CardTitle>
                  <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{stats.active_customers}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.total_customers > 0
                      ? ((stats.active_customers / stats.total_customers) * 100).toFixed(1)
                      : 0}% من إجمالي العملاء
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-blue-50 dark:bg-slate-700/50 border-blue-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-300">أفضل 5 عملاء</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.top_customers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    لا يوجد عملاء مميزين حاليًا
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700">
                        <TableHead className="text-sm font-semibold text-blue-900 dark:text-blue-300">الاسم</TableHead>
                        <TableHead className="text-sm   font-semibold text-blue-900 dark:text-blue-300">الهاتف</TableHead>
                        <TableHead className="text-sm font-semibold text-blue-900 dark:text-blue-300">إجمالي المشتريات</TableHead>
                        <TableHead className="text-sm font-semibold text-blue-900 dark:text-blue-300">عدد الفواتير</TableHead>
                        <TableHead className="text-sm font-semibold text-blue-900 dark:text-blue-300">آخر عملية</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.top_customers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <TableCell className="text-sm font-medium text-gray-900 dark:text-gray-200">{customer.name}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">{customer.phone || '-'}</TableCell>
                          <TableCell className="text-sm font-semibold text-gray-900 dark:text-gray-200">{Number(customer.total_purchases).toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-sm text-gray-800 dark:text-gray-200">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {customer.purchases_count} فاتورة
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {customer.updated_at
                              ? format(new Date(customer.updated_at), "yyyy-MM-dd HH:mm")
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            لا توجد بيانات إحصائية متاحة
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerStats;