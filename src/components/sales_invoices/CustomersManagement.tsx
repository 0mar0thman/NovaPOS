import { useState, useEffect, useContext } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { format } from "date-fns";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Loader2, User, Plus, Edit, FileText, Trash2, BarChart2, ChevronRight, ChevronLeft } from "lucide-react";
import CustomerFormDialog from "./CustomerFormDialog";
import CustomerStats from "./CustomerStats";
import CustomerInvoicesDialog from "./CustomerInvoicesDialog";
import { Customer } from "./SalesInvoices";
import { AbilityContext } from "@/config/ability";
import { Can } from '@/components/Can';

interface CustomersManagementProps {
  onCustomerChange?: () => void;
}

const CustomersManagement = ({ onCustomerChange }: CustomersManagementProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const customersPerPage = 10;
  const { toast } = useToast();
  const ability = useContext(AbilityContext);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/api/customers", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          params: {
            per_page: customersPerPage,
            page: currentPage,
            search: searchTerm || undefined, // إضافة searchTerm إلى الاستعلام
            status: filterStatus !== "all" ? filterStatus : undefined, // إضافة filterStatus
          },
        });

        const fetchedCustomers = Array.isArray(response.data.data.data)
          ? response.data.data.data
          : response.data.data?.data || [];
        const total = response.data.data.total || fetchedCustomers.length;

        setCustomers(fetchedCustomers);
        setTotalCustomers(total);
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل تحميل بيانات العملاء",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, [currentPage, searchTerm, filterStatus]); // إعادة الجلب عند تغيير الصفحة، البحث، أو الحالة

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // إعادة تعيين الصفحة إلى الأولى عند البحث
  };

  const handleFilterStatus = (value: "all" | "active" | "inactive") => {
    setFilterStatus(value);
    setCurrentPage(1); // إعادة تعيين الصفحة إلى الأولى عند تغيير الفلتر
  };

  const handleFormSubmit = async (data: Partial<Customer>) => {
    try {
      setIsLoading(true);
      if (selectedCustomer) {
        const response = await api.put(`/api/customers/${selectedCustomer.id}`, data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        setCustomers(
          customers.map((customer) =>
            customer.id === selectedCustomer.id
              ? { ...customer, ...response.data.data }
              : customer
          )
        );
        toast({
          title: "تم التعديل",
          description: `تم تعديل العميل ${data.name} بنجاح`,
        });
      } else {
        const response = await api.post("/api/customers", data, {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
        });
        setCustomers([response.data.data, ...customers]);
        setTotalCustomers(totalCustomers + 1);
        toast({
          title: "تم الإضافة",
          description: `تم إضافة العميل ${data.name} بنجاح`,
        });
      }
      setIsFormOpen(false);
      setSelectedCustomer(null);
      if (onCustomerChange) onCustomerChange();
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل حفظ بيانات العميل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setCustomers(customers.filter((customer) => customer.id.toString() !== customerId));
      setTotalCustomers(totalCustomers - 1);
      toast({
        title: "تم الحذف",
        description: "تم حذف العميل بنجاح",
      });
      if (onCustomerChange) onCustomerChange();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل حذف العميل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInvoices = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsInvoicesOpen(true);
  };

  const totalPages = Math.ceil(totalCustomers / customersPerPage);

  return (
    <div className="space-y-6 max-h-[90vh] overflow-y-auto">
      {/* عنوان الإدارة والأزرار */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl">
        <CardHeader className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-300">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                إدارة العملاء
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                إجمالي العملاء: {totalCustomers} | المعروض: {customers.length}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsStatsOpen(true)}
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-blue-300 dark:border-slate-600 text-blue-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                الإحصائيات
              </Button>
              {/* {ability.can('create', 'Customer') && ( */}
                <Can action="create" subject="Customer">
                 <Button
                   onClick={() => {
                     setSelectedCustomer(null);
                     setIsFormOpen(true);
                   }}
                   className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors duration-200"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   عميل جديد
                 </Button>
                 </Can>
              {/* )} */}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* البحث والتصفية */}
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl">
        <CardHeader className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="ابحث بالاسم، الهاتف، البريد الإلكتروني أو العنوان..."
                className="pl-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={handleFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg">
                <SelectValue placeholder="حالة العميل">
                  {filterStatus === "all" ? "جميع العملاء" : filterStatus === "active" ? "العملاء النشطين" : "العملاء غير النشطين"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg">
                <SelectItem value="all">جميع العملاء</SelectItem>
                <SelectItem value="active">العملاء النشطين</SelectItem>
                <SelectItem value="inactive">العملاء غير النشطين</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
              لا يوجد عملاء لعرضهم
            </div>
          ) : (
            <>
              {/* الجدول */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800">
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الرقم</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الاسم</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الهاتف</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">العنوان</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الملاحظات</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">إجمالي المشتريات</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">عدد الفواتير</TableHead>
                    <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">آخر عملية</TableHead>
                    <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                    >
                      <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">{customer.id}</TableCell>
                      <TableCell className="text-sm font-medium text-gray-800 dark:text-gray-200 py-3">
                        <div className="flex items-center gap-2">
                          {customer.name}
                          {customer.purchases_count > 0 && (
                            <Badge className="bg-green-100 text-green-400 dark:bg-green-900 dark:text-white-200 text-xs">
                              نشط
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">{customer.phone || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">{customer.email || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">{customer.address || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">
                        {customer.notes ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block max-w-[150px]">{customer.notes}</span>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                <p>{customer.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">{Number(customer.total_purchases).toFixed(2)} ج.م</TableCell>
                      <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">{customer.purchases_count}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">
                        {customer.updated_at
                          ? format(new Date(customer.updated_at), "yyyy-MM-dd HH:mm")
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex gap-2 justify-end">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setIsFormOpen(true);
                                  }}
                                  className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                تعديل العميل
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewInvoices(customer.id.toString())}
                                  className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                عرض فواتير العميل
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(customer.id.toString())}
                                  disabled={isLoading}
                                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                حذف العميل
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6" dir="rtl">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    عرض {customers.length} من أصل {totalCustomers} عميل
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      السابق
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        size="sm"
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm font-medium ${
                          currentPage === page
                            ? "bg-blue-600 text-white dark:bg-blue-700 dark:text-gray-200"
                            : "border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        {page}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      التالي
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <CustomerFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          customer={selectedCustomer}
          onSubmit={handleFormSubmit}
          isLoading={isLoading}
        />
      </Dialog>

      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <CustomerStats
          open={isStatsOpen}
          onOpenChange={setIsStatsOpen}
        />
      </Dialog>

      <Dialog open={isInvoicesOpen} onOpenChange={setIsInvoicesOpen}>
        <CustomerInvoicesDialog
          open={isInvoicesOpen}
          onOpenChange={setIsInvoicesOpen}
          customerId={selectedCustomerId}
        />
      </Dialog>
    </div>
  );
};

export default CustomersManagement;