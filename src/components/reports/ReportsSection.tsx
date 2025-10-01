import { useReducer, useEffect, useCallback, useMemo, useState } from "react";
import axios, { AxiosError } from "axios";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  FileText,
  Calendar,
  TrendingUp,
  ShoppingCart,
  Package,
  DollarSign,
  User,
  CreditCard,
  Box,
  Activity,
  Loader2,
  AlertCircle,
  Download,
  Users,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import { debounce } from "lodash";
import { saveAs } from "file-saver";
import { Category, Role, ReportData, FilterState, User_Role } from "./types";

// Constants
const COLORS = {
  cash: "#3b82f6",
  vodafone_cash: "#10b981",
  instapay: "#f59e0b",
};
const PAYMENT_METHODS = {
  cash: "نقدي",
  vodafone_cash: "فودافون كاش",
  instapay: "إنستاباي",
};
const API_BASE_URL = "/api";
const REPORT_TYPES = {
  sales: "تقرير المبيعات",
  top_selling: "المنتجات الأكثر مبيعاً",
  purchases: "تقرير المشتريات",
  inventory: "تقرير المخزون",
  profits: "تقرير الأرباح",
  performance: "أداء الموظفين",
};
const GROUP_BY_OPTIONS = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
};

type FilterAction =
  | { type: "SET_REPORT"; payload: string }
  | { type: "SET_DATE_FROM"; payload: string }
  | { type: "SET_DATE_TO"; payload: string }
  | { type: "SET_GROUP_BY"; payload: string }
  | { type: "SET_CATEGORY_ID"; payload: string }
  | { type: "SET_USER_ID"; payload: string }
  | { type: "SET_ROLE_ID"; payload: string }
  | { type: "SET_SUPPLIER"; payload: string }
  | { type: "RESET" };

// Reducer for filter state
const filterReducer = (
  state: FilterState,
  action: FilterAction
): FilterState => {
  switch (action.type) {
    case "SET_REPORT":
      return { ...state, selectedReport: action.payload };
    case "SET_DATE_FROM":
      return { ...state, dateFrom: action.payload };
    case "SET_DATE_TO":
      return { ...state, dateTo: action.payload };
    case "SET_GROUP_BY":
      return { ...state, groupBy: action.payload };
    case "SET_CATEGORY_ID":
      return { ...state, categoryId: action.payload };
    case "SET_USER_ID":
      return { ...state, userId: action.payload };
    case "SET_ROLE_ID":
      return { ...state, roleId: action.payload };
    case "SET_SUPPLIER":
      return { ...state, supplier: action.payload };
    case "RESET":
      return {
        selectedReport: "sales",
        dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0],
        dateTo: new Date().toISOString().split("T")[0],
        groupBy: "daily",
        categoryId: "all",
        userId: "all",
        roleId: "all",
        supplier: "",
      };
    default:
      return state;
  }
};

// Component
const ReportsSection = () => {
  const [filterState, dispatch] = useReducer(filterReducer, {
    selectedReport: "sales",
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    groupBy: "daily",
    categoryId: "all",
    userId: "all",
    roleId: "all",
    supplier: "",
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User_Role[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Fetch initial data (categories, users, roles, and suppliers)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [
          categoriesResponse,
          usersResponse,
          rolesResponse,
          suppliersResponse,
        ] = await Promise.all([
          api.get("/api/categories"),
          api.get("/api/users"),
          api.get("/api/roles"),
          api.get("/api/suppliers"),
        ]);

        setCategories(
          categoriesResponse.data || categoriesResponse.data.categories || []
        );
        setUsers(usersResponse.data.users || usersResponse.data.users || []);
        setRoles(rolesResponse.data.roles || rolesResponse.data.roles || []);
        setSuppliers(
          suppliersResponse.data.suppliers ||
            suppliersResponse.data.suppliers ||
            []
        );
        console.log(usersResponse.data.users);
      } catch (err) {
        handleError(err, "حدث خطأ أثناء جلب البيانات الأولية");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Error handling utility
  const handleError = (err: unknown, defaultMessage: string) => {
    const axiosError = err as AxiosError<{
      message?: string;
      errors?: Record<string, string[]>;
    }>;
    let errorMessage = defaultMessage;

    if (axiosError.response) {
      if (axiosError.response.status === 401) {
        toast.error("جلسة غير مصرح بها، يرجى تسجيل الدخول");
        window.location.href = "/login";
        return;
      }
      if (axiosError.response.status === 422) {
        const errors = axiosError.response.data?.errors;
        errorMessage = errors
          ? Object.values(errors).flat().join(", ")
          : "بيانات الإدخال غير صالحة";
      } else {
        errorMessage = axiosError.response.data?.message || defaultMessage;
      }
    }

    setError(errorMessage);
    toast.error(errorMessage);
    console.error("Error Details:", {
      message: errorMessage,
      status: axiosError.response?.status,
      data: axiosError.response?.data,
    });
  };

  // Validate dates
  const validateDates = useCallback(() => {
    if (!filterState.dateFrom || !filterState.dateTo) {
      setError("يرجى تحديد تاريخ البداية والنهاية");
      toast.error("يرجى تحديد تاريخ البداية والنهاية");
      return false;
    }
    if (new Date(filterState.dateTo) < new Date(filterState.dateFrom)) {
      setError("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      toast.error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      return false;
    }
    return true;
  }, [filterState.dateFrom, filterState.dateTo]);

  // Debounced report generation
  const generateReport = useCallback(
    debounce(async () => {
      if (!validateDates()) return;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          from: filterState.dateFrom,
          to: filterState.dateTo,
        });

        let url = "";
        switch (filterState.selectedReport) {
          case "sales":
            params.append("group_by", filterState.groupBy);
            if (filterState.userId !== "all")
              params.append("user_id", filterState.userId);
            if (filterState.roleId !== "all")
              params.append("role_id", filterState.roleId);
            url = `/api/reports/sales-summary?${params.toString()}`;
            break;
          case "top_selling":
            if (filterState.categoryId !== "all")
              params.append("category_id", filterState.categoryId);
            url = `/api/reports/top-selling-products?${params.toString()}`;
            break;
          case "purchases":
            if (filterState.supplier)
              params.append("supplier_id", filterState.supplier);
            url = `/api/reports/purchase-summary?${params.toString()}`;
            break;
          case "inventory":
            if (filterState.categoryId !== "all")
              params.append("category_id", filterState.categoryId);
            url = `/api/reports/inventory?${params.toString()}`;
            break;
          case "profits":
            if (filterState.categoryId !== "all")
              params.append("category_id", filterState.categoryId);
            url = `/api/reports/profit-loss?${params.toString()}`;
            break;
          case "performance":
            if (filterState.userId !== "all")
              params.append("user_id", filterState.userId);
            if (filterState.roleId !== "all")
              params.append("role_id", filterState.roleId);
            url = `/api/reports/employee-performance?${params.toString()}`;
            break;
          default:
            throw new Error("نوع التقرير غير معروف");
        }

        const response = await api.get(url);
        if (response.status !== 200) {
          throw new Error("فشل في جلب بيانات التقرير");
        }

        setReportData(response.data.data || response.data);
        toast.success("تم إنشاء التقرير بنجاح");
      } catch (err) {
        handleError(err, "حدث خطأ أثناء جلب بيانات التقرير");
      } finally {
        setLoading(false);
      }
    }, 500),
    [filterState, validateDates]
  );

  // Export report to CSV
  const exportToCSV = useCallback(() => {
    if (!reportData) {
      toast.error("لا توجد بيانات لتصديرها");
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Arabic support
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (filterState.selectedReport) {
      case "sales":
        headers = [
          "التاريخ",
          "الفواتير",
          "إجمالي المبيعات",
          "المدفوع",
          "المتوسط",
          "المستحق",
        ];
        rows =
          reportData.summary?.map((item) => [
            item.day || item.week || item.month || "-",
            item.invoices_count.toString(),
            Number(item.total_sales).toFixed(2),
            Number(item.total_paid).toFixed(2),
            Number(item.average_sale).toFixed(2),
            Number(item.total_due).toFixed(2),
          ]) || [];
        break;
      case "top_selling":
        headers = [
          "المنتج",
          "الفئة",
          "الكمية",
          "المبيعات",
          "التكلفة",
          "الربح",
          "الهامش",
        ];
        rows =
          reportData.products?.map((product) => [
            product.name,
            product.category_name || "-",
            product.quantity_sold.toString(),
            Number(product.total_sales).toFixed(2),
            Number(product.total_cost).toFixed(2),
            Number(product.total_profit).toFixed(2),
            Number(product.profit_margin).toFixed(2) + "%",
          ]) || [];
        break;
      case "purchases":
        headers = [
          "التاريخ",
          "الفواتير",
          "إجمالي المشتريات",
          "المدفوع",
          "المستحق",
        ];
        rows =
          reportData.summary?.map((item) => [
            item.day || item.week || item.month || "-",
            item.invoices_count.toString(),
            (Number(item.total_paid) + Number(item.total_due)).toFixed(2),
            Number(item.total_paid).toFixed(2),
            Number(item.total_due).toFixed(2),
          ]) || [];
        break;
      case "inventory":
        headers = [
          "المنتج",
          "الفئة",
          "الباركود",
          "المخزون",
          "حد التنبيه",
          "قيمة المخزون",
        ];
        rows =
          reportData.inventory?.map((item) => [
            item.name,
            item.category_name || "-",
            item.barcode || "-",
            item.stock.toString(),
            item.min_stock.toString(),
            Number(item.stock_value).toFixed(2),
          ]) || [];
        break;
      case "profits":
        headers = ["الفئة", "المبيعات", "الربح", "الهامش"];
        rows =
          reportData.profit_by_category?.map((item) => [
            item.name,
            Number(item.total_sales).toFixed(2),
            Number(item.gross_profit).toFixed(2),
            Number(item.profit_margin).toFixed(2) + "%",
          ]) || [];
        break;
      case "performance":
        headers = [
          "الموظف",
          "عدد الفواتير",
          "إجمالي المبيعات",
          "المتوسط",
          "المدفوع",
          "المستحق",
        ];
        rows =
          reportData.employees?.map((employee) => [
            employee.name,
            employee.total_invoices.toString(),
            Number(employee.total_sales).toFixed(2),
            Number(employee.average_invoice).toFixed(2),
            Number(employee.total_paid).toFixed(2),
            Number(employee.total_sales - employee.total_paid).toFixed(2),
          ]) || [];
        break;
    }

    csvContent += headers.join(",") + "\n";
    csvContent += rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(
      blob,
      `report_${filterState.selectedReport}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    toast.success("تم تصدير التقرير بنجاح");
  }, [reportData, filterState.selectedReport]);

  // Reset filters
  const resetFilters = useCallback(() => {
    dispatch({ type: "RESET" });
    setReportData(null);
    setError(null);
    toast.success("تم إعادة تعيين الفلاتر");
  }, []);

  // Memoized report content
  const reportContent = useMemo(() => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-slate-800 rounded-lg transition-all duration-300">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 dark:text-blue-400" />
          <span className="mr-3 text-lg font-medium text-gray-700 dark:text-gray-300">
            جارٍ تحميل التقرير...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-4 rounded-lg shadow-sm flex items-center gap-3 transition-all duration-300">
          <AlertCircle className="w-6 h-6" />
          <div>
            <strong className="font-bold">خطأ!</strong>
            <span className="block sm:inline mr-2">{error}</span>
          </div>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-6 py-4 rounded-lg shadow-sm flex items-center gap-3 transition-all duration-300">
          <FileText className="w-6 h-6" />
          <div>
            <strong className="font-bold">مرحبًا!</strong>
            <span className="block sm:inline mr-2">
              اختر التقرير واضغط على إنشاء التقرير لرؤية البيانات.
            </span>
          </div>
        </div>
      );
    }

    switch (filterState.selectedReport) {
      case "sales":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div className="text-center p-2">
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <TrendingUp className="w-7 h-7" />
                    تقرير المبيعات الشامل
                  </CardTitle>
                  <div className="text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300 mt-2">
                    {new Date(filterState.dateFrom).toLocaleDateString("en-EG")}{" "}
                    - {new Date(filterState.dateTo).toLocaleDateString("en-EG")}
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      ملخص المبيعات
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            التاريخ
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفواتير
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            إجمالي المبيعات
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المدفوع
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المتوسط
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المستحق
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.summary?.length ? (
                          reportData.summary.map((item, index) => (
                            <TableRow
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                              }
                            >
                              <TableCell className="dark:text-gray-200">
                                {item.day || item.week || item.month || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.invoices_count}
                              </TableCell>
                              <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                {Number(item.total_sales).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="text-green-600 dark:text-green-400">
                                {Number(item.total_paid).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {Number(item.average_sale).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400">
                                {Number(item.total_due).toFixed(2)} ج.م
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      تطور المبيعات
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={reportData.summary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey={
                            filterState.groupBy === "daily"
                              ? "day"
                              : filterState.groupBy === "weekly"
                              ? "week"
                              : "month"
                          }
                          tick={{ fontSize: 12, fill: "#374151" }}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("ar-EG")
                          }
                        />
                        <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} ج.م`,
                            "",
                          ]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            fontSize: "14px",
                            transition: "all 0.3s ease",
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar
                          dataKey="total_sales"
                          name="إجمالي المبيعات"
                          fill={COLORS.cash}
                          radius={[4, 4, 0, 0]}
                          animationDuration={800}
                        />
                        <Bar
                          dataKey="total_paid"
                          name="المدفوع"
                          fill={COLORS.vodafone_cash}
                          radius={[4, 4, 0, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300 transition-all duration-300">
                        <User className="w-5 h-5" />
                        أفضل العملاء
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader className="bg-blue-50 dark:bg-slate-700 transition-all duration-300">
                          <TableRow>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              العميل
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              الفواتير
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              إجمالي المشتريات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.top_customers?.length ? (
                            reportData.top_customers.map((customer, index) => (
                              <TableRow
                                key={index}
                                className={
                                  index % 2 === 0
                                    ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                    : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                                }
                              >
                                <TableCell className="font-medium dark:text-gray-200">
                                  {customer.customer_name || "-"}
                                </TableCell>
                                <TableCell className="dark:text-gray-200">
                                  {customer.invoices_count}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                                  {Number(customer.total_sales).toFixed(2)} ج.م
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-gray-500 dark:text-gray-400"
                              >
                                لا توجد بيانات متاحة
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300 transition-all duration-300">
                        <CreditCard className="w-5 h-5" />
                        طرق الدفع
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      {reportData.payment_methods?.length ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart
                            data={reportData.payment_methods}
                            layout="vertical"
                            margin={{
                              top: 20,
                              right: 30,
                              left: 40,
                              bottom: 20,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis
                              dataKey="payment_method"
                              type="category"
                              width={100}
                              tickFormatter={(value) =>
                                PAYMENT_METHODS[value] || value
                              }
                              tick={{ fontSize: 12, fill: "#374151" }}
                            />
                            <Tooltip
                              formatter={(value) => [
                                `${Number(value).toFixed(2)} ج.م`,
                                "",
                              ]}
                              labelFormatter={(value) =>
                                PAYMENT_METHODS[value] || value
                              }
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                padding: "12px",
                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                fontSize: "14px",
                                transition: "all 0.3s ease",
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="total"
                              name="إجمالي المدفوعات"
                              fill="#3b82f6"
                              radius={[0, 4, 4, 0]}
                            >
                              {reportData.payment_methods.map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      COLORS[entry.payment_method] || "#6b7280"
                                    }
                                  />
                                )
                              )}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 transition-all duration-300">
                          <AlertCircle className="w-12 h-12 mb-4" />
                          <p>لا توجد بيانات لطرق الدفع</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "top_selling":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <Activity className="w-7 h-7" />
                    المنتجات الأكثر مبيعاً
                  </CardTitle>
                  <div className="text-center mt-2 mb-2 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300">
                    تحليل الربحية حسب المنتج والفئة
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    ترتيب المنتجات
                  </h3>
                  <Table>
                    <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                      <TableRow>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          المنتج
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          الفئة
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          الكمية
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          المبيعات
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          التكلفة
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          الربح
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          الهامش
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.products?.length ? (
                        reportData.products.map((product, index) => (
                          <TableRow
                            key={product.id}
                            className={
                              index % 2 === 0
                                ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                            }
                          >
                            <TableCell className="font-medium dark:text-gray-200">
                              {product.name}
                            </TableCell>
                            <TableCell className="dark:text-gray-200">
                              {product.category_name || "-"}
                            </TableCell>
                            <TableCell className="dark:text-gray-200">
                              {Number(product.quantity_sold)}
                            </TableCell>
                            <TableCell className="text-blue-600 dark:text-blue-400">
                              {Number(product.total_sales).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="text-red-600 dark:text-red-400">
                              {Number(product.total_cost).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                              {Number(product.total_profit).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="dark:text-gray-200">
                              <div className="flex items-center gap-2">
                                <span>
                                  {Number(product.profit_margin).toFixed(2)}%
                                </span>
                                <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 transition-all duration-300">
                                  <div
                                    className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(
                                        Number(product.profit_margin),
                                        100
                                      )}%`,
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-gray-500 dark:text-gray-400"
                          >
                            لا توجد بيانات متاحة
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-6">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                        <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        المبيعات حسب الفئة
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={reportData.categories}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#374151" }}
                          />
                          <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
                          <Tooltip
                            formatter={(value) => [
                              `${Number(value).toFixed(2)} ج.م`,
                              "",
                            ]}
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "10px",
                              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                              fontSize: "14px",
                              transition: "all 0.3s ease",
                            }}
                          />
                          <Legend verticalAlign="top" height={36} />
                          <Bar
                            dataKey="total_sales"
                            name="إجمالي المبيعات"
                            fill={COLORS.cash}
                            radius={[4, 4, 0, 0]}
                            animationDuration={800}
                          />
                          <Bar
                            dataKey="total_profit"
                            name="إجمالي الربح"
                            fill={COLORS.vodafone_cash}
                            radius={[4, 4, 0, 0]}
                            animationDuration={800}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-6">
                      <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        توزيع الربح حسب الفئة
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                          <Pie
                            data={reportData.categories}
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            dataKey="total_profit"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                          >
                            {reportData.categories?.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  Object.values(COLORS)[
                                    index % Object.keys(COLORS).length
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [
                              `${Number(value).toFixed(2)} ج.م`,
                              "",
                            ]}
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              padding: "10px",
                              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                              fontSize: "14px",
                              transition: "all 0.3s ease",
                            }}
                          />
                          <Legend
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "purchases":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <ShoppingCart className="w-7 h-7" />
                    تقرير المشتريات
                  </CardTitle>
                  <div className="text-center mt-2 mb-2 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300">
                    {new Date(filterState.dateFrom).toLocaleDateString("en-EG")}{" "}
                    - {new Date(filterState.dateTo).toLocaleDateString("en-EG")}
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      ملخص المشتريات
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            التاريخ
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفواتير
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            إجمالي المشتريات
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المدفوع
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المستحق
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.summary?.length ? (
                          reportData.summary.map((item, index) => (
                            <TableRow
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                              }
                            >
                              <TableCell className="dark:text-gray-200">
                                {item.day || item.week || item.month || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.invoices_count}
                              </TableCell>
                              <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                                {(
                                  Number(item.total_paid) +
                                  Number(item.total_due)
                                ).toFixed(2)}{" "}
                                ج.م
                              </TableCell>
                              <TableCell className="text-green-600 dark:text-green-400">
                                {Number(item.total_paid).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400">
                                {Number(item.total_due).toFixed(2)} ج.م
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      تطور المشتريات
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={reportData.summary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey={
                            filterState.groupBy === "daily"
                              ? "day"
                              : filterState.groupBy === "weekly"
                              ? "week"
                              : "month"
                          }
                          tick={{ fontSize: 12, fill: "#374151" }}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("ar-EG")
                          }
                        />
                        <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} ج.م`,
                            "",
                          ]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid ",
                            borderRadius: "8px",
                            padding: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            fontSize: "14px",
                            transition: "all 0.3s ease",
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                          type="monotone"
                          dataKey="total_sales"
                          name="إجمالي المشتريات"
                          stroke={COLORS.cash}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_paid"
                          name="المدفوع"
                          stroke={COLORS.vodafone_cash}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300 transition-all duration-300">
                        <User className="w-5 h-5" />
                        أهم الموردين
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader className="bg-blue-50 dark:bg-slate-700 transition-all duration-300">
                          <TableRow>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              المورد
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              الفواتير
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              إجمالي المشتريات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.top_suppliers?.length ? (
                            reportData.top_suppliers.map((supplier, index) => (
                              <TableRow
                                key={index}
                                className={
                                  index % 2 === 0
                                    ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                    : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                                }
                              >
                                <TableCell className="font-medium dark:text-gray-200">
                                  {supplier.supplier_name || "-"}
                                </TableCell>
                                <TableCell className="dark:text-gray-200">
                                  {supplier.invoices_count}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                                  {Number(supplier.total_purchases).toFixed(2)}{" "}
                                  ج.م
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-gray-500 dark:text-gray-400"
                              >
                                لا توجد بيانات متاحة
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300 transition-all duration-300">
                        <Package className="w-5 h-5" />
                        أكثر المنتجات شراءً
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader className="bg-blue-50 dark:bg-slate-700 transition-all duration-300">
                          <TableRow>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              المنتج
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              الكمية
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                              إجمالي المشتريات
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.top_products?.length ? (
                            reportData.top_products.map((product, index) => (
                              <TableRow
                                key={product.id}
                                className={
                                  index % 2 === 0
                                    ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                    : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                                }
                              >
                                <TableCell className="font-medium dark:text-gray-200">
                                  {product.name}
                                </TableCell>
                                <TableCell className="dark:text-gray-200">
                                  {Number(product.quantity_purchased)}
                                </TableCell>
                                <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                                  {Number(product.total_purchases).toFixed(2)}{" "}
                                  ج.م
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center text-gray-500 dark:text-gray-400"
                              >
                                لا توجد بيانات متاحة
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "inventory":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <Box className="w-7 h-7" />
                    تقرير المخزون
                  </CardTitle>
                  <div className="text-center mt-2 mb-2 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300">
                    {new Date(filterState.dateFrom).toLocaleDateString("en-EG")}{" "}
                    - {new Date(filterState.dateTo).toLocaleDateString("en-EG")}
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      ملخص المخزون
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المنتج
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفئة
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الباركود
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المخزون
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            حد التنبيه
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            قيمة المخزون
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.inventory?.length ? (
                          reportData.inventory.map((item, index) => (
                            <TableRow
                              key={item.id}
                              className={
                                item.below_min_stock
                                  ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/40 transition-all duration-300"
                                  : index % 2 === 0
                                  ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                              }
                            >
                              <TableCell className="font-medium dark:text-gray-200">
                                {item.name}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.category_name || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.barcode || "-"}
                              </TableCell>
                              <TableCell
                                className={
                                  item.below_min_stock
                                    ? "text-red-600 dark:text-red-400 font-bold"
                                    : "dark:text-gray-200"
                                }
                              >
                                {Number(item.stock)}{" "}
                                {item.below_min_stock && (
                                  <AlertCircle className="inline w-4 h-4 mr-1" />
                                )}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {Number(item.min_stock)}
                              </TableCell>
                              <TableCell className="font-semibold dark:text-gray-200">
                                {Number(item.stock_value).toFixed(2)} ج.م
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      المنتجات التي اقترب انتهاء صلاحيتها
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المنتج
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفئة
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            تاريخ الانتهاء
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الكمية
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.expiring_soon_items?.length ? (
                          reportData.expiring_soon_items.map((item, index) => (
                            <TableRow
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                              }
                            >
                              <TableCell className="font-medium dark:text-gray-200">
                                {item.name || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.category_name || "-"}
                              </TableCell>
                              <TableCell className="text-orange-600 dark:text-orange-400 font-medium">
                                {new Date(item.expiry_date).toLocaleDateString(
                                  "en-EG"
                                )}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {Number(item.quantity)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 mt-6 transition-all duration-300">
                      <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      المنتجات المنتهية الصلاحية
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المنتج
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفئة
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            تاريخ الانتهاء
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الكمية
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.expired_items?.length ? (
                          reportData.expired_items.map((item, index) => (
                            <TableRow
                              key={index}
                              className={
                                index % 2 === 0
                                  ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/40 transition-all duration-300"
                                  : "bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/40 transition-all duration-300"
                              }
                            >
                              <TableCell className="font-medium dark:text-gray-200">
                                {item.name || "-"}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {item.category_name || "-"}
                              </TableCell>
                              <TableCell className="text-red-600 dark:text-red-400 font-medium">
                                {new Date(item.expiry_date).toLocaleDateString(
                                  "ar-EG"
                                )}
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                {Number(item.quantity)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="space-y-6 mt-8">
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    توزيع الكميات حسب الفئة
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={reportData.inventory_by_category?.map(
                        (category) => ({
                          name: category.name,
                          expiring_soon:
                            reportData.expiring_soon_items
                              ?.filter(
                                (item) => item.category_name === category.name
                              )
                              .reduce((sum, item) => sum + item.quantity, 0) ||
                            0,
                          expired:
                            reportData.expired_items
                              ?.filter(
                                (item) => item.category_name === category.name
                              )
                              .reduce((sum, item) => sum + item.quantity, 0) ||
                            0,
                        })
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#374151" }}
                      />
                      <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value)} وحدة`, ""]}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "10px",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey="expiring_soon"
                        name="المنتجات التي اقترب انتهاء صلاحيتها"
                        fill={COLORS.cash}
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                      />
                      <Bar
                        dataKey="expired"
                        name="المنتجات المنتهية الصلاحية"
                        fill={COLORS.vodafone_cash}
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "profits":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <DollarSign className="w-7 h-7" />
                    تقرير الأرباح والخسائر
                  </CardTitle>
                  <div className="text-center mt-2 mb-2 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300">
                    {new Date(filterState.dateFrom).toLocaleDateString("en-EG")}{" "}
                    - {new Date(filterState.dateTo).toLocaleDateString("en-EG")}
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-blue-800 dark:text-blue-300 flex items-center gap-2 transition-all duration-300">
                        <TrendingUp className="w-5 h-5" />
                        إجمالي المبيعات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 transition-all duration-300">
                        {Number(reportData.total_sales || 0).toFixed(2)} ج.م
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/40 border border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-green-800 dark:text-green-300 flex items-center gap-2 transition-all duration-300">
                        <DollarSign className="w-5 h-5" />
                        إجمالي الربح
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400 transition-all duration-300">
                        {Number(reportData.gross_profit || 0).toFixed(2)} ج.م
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/40 border border-red-200 dark:border-red-800 shadow-md hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-800 dark:text-red-300 flex items-center gap-2 transition-all duration-300">
                        <ShoppingCart className="w-5 h-5" />
                        تكلفة البضاعة المباعة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-400 transition-all duration-300">
                        {Number(reportData.cost_of_goods_sold || 0).toFixed(2)}{" "}
                        ج.م
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      الربحية حسب الفئة
                    </h3>
                    <Table>
                      <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                        <TableRow>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الفئة
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            المبيعات
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الربح
                          </TableHead>
                          <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                            الهامش
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.profit_by_category?.length ? (
                          reportData.profit_by_category.map((item, index) => (
                            <TableRow
                              key={item.id}
                              className={
                                index % 2 === 0
                                  ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                  : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                              }
                            >
                              <TableCell className="font-medium dark:text-gray-200">
                                {item.name}
                              </TableCell>
                              <TableCell className="text-blue-600 dark:text-blue-400">
                                {Number(item.total_sales).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="text-green-600 dark:text-green-400 font-semibold">
                                {Number(item.gross_profit).toFixed(2)} ج.م
                              </TableCell>
                              <TableCell className="dark:text-gray-200">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {Number(item.profit_margin).toFixed(2)}%
                                  </span>
                                  <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 transition-all duration-300">
                                    <div
                                      className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(
                                          Number(item.profit_margin),
                                          100
                                        )}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات متاحة
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-6">
                    <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      اتجاه الربحية
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={reportData.profit_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12, fill: "#374151" }}
                          tickFormatter={(value) =>
                            new Date(value).toLocaleDateString("ar-EG")
                          }
                        />
                        <YAxis tick={{ fontSize: 12, fill: "#374151" }} />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toFixed(2)} ج.م`,
                            "",
                          ]}
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            padding: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            fontSize: "14px",
                            transition: "all 0.3s ease",
                          }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                          type="monotone"
                          dataKey="gross_profit"
                          name="إجمالي الربح"
                          stroke={COLORS.vodafone_cash}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="total_sales"
                          name="إجمالي المبيعات"
                          stroke={COLORS.cash}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case "performance":
        return (
          <div className="space-y-8 dark:bg-slate-800 transition-all duration-300">
            <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
              <CardHeader className="pb-4 flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-2xl font-bold transition-all duration-300">
                    <Users className="w-7 h-7" />
                    تقرير أداء الموظفين
                  </CardTitle>
                  <div className="text-center mt-2 mb-2 text-gray-600 dark:text-gray-400 text-sm font-medium transition-all duration-300">
                    {new Date(filterState.dateFrom).toLocaleDateString("en-EG")}{" "}
                    - {new Date(filterState.dateTo).toLocaleDateString("en-EG")}
                  </div>
                </div>
                <Button
                  onClick={exportToCSV}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition-all duration-300"
                >
                  <Download className="w-5 h-5 mr-2" />
                  تصدير إلى CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    أداء الموظفين
                  </h3>
                  <Table>
                    <TableHeader className="bg-blue-100 dark:bg-slate-700 transition-all duration-300">
                      <TableRow>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          الموظف
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          عدد الفواتير
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          إجمالي المبيعات
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          متوسط الفاتورة
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          المدفوع
                        </TableHead>
                        <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">
                          المستحق
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.employees?.length ? (
                        reportData.employees.map((employee, index) => (
                          <TableRow
                            key={employee.id}
                            className={
                              index % 2 === 0
                                ? "bg-gray-50 hover:bg-gray-100 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-300"
                                : "hover:bg-gray-100 dark:hover:bg-slate-600 transition-all duration-300"
                            }
                          >
                            <TableCell className="font-medium dark:text-gray-200">
                              {employee.name}
                            </TableCell>
                            <TableCell className="dark:text-gray-200">
                              {employee.total_invoices}
                            </TableCell>
                            <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                              {Number(employee.total_sales).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="dark:text-gray-200">
                              {Number(employee.average_invoice).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="text-green-600 dark:text-green-400">
                              {Number(employee.total_paid).toFixed(2)} ج.م
                            </TableCell>
                            <TableCell className="text-red-600 dark:text-red-400">
                              {Number(
                                employee.total_sales - employee.total_paid
                              ).toFixed(2)}{" "}
                              ج.م
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-gray-500 dark:text-gray-400"
                          >
                            لا توجد بيانات متاحة
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-8">
                  <h3 className="font-semibold text-xl flex items-center gap-2 text-gray-800 dark:text-gray-200 transition-all duration-300">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    مقارنة أداء الموظفين
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={reportData.employees}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="user_name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          `${Number(value).toFixed(2)} ج.م`,
                          "",
                        ]}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          padding: "10px",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          fontSize: "14px",
                          transition: "all 0.3s ease",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="total_sales"
                        name="إجمالي المبيعات"
                        fill={COLORS.cash}
                      />
                      <Bar
                        dataKey="total_paid"
                        name="المدفوع"
                        fill={COLORS.vodafone_cash}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-6 py-4 rounded-lg shadow-sm flex items-center gap-3 transition-all duration-300">
            <FileText className="w-6 h-6" />
            <div>
              <strong className="font-bold">ملاحظة!</strong>
              <span className="block sm:inline mr-2">
                اختر نوع التقرير من القائمة.
              </span>
            </div>
          </div>
        );
    }
  }, [loading, error, reportData, filterState, exportToCSV]);

  // Handle input changes
  const handleInputChange = useCallback(
    (type: FilterAction["type"], value: string) => {
      dispatch({ type, payload: value });
    },
    []
  );

  return (
    <div
      className="container mx-auto p-0 space-y-8 bg-gray-100 dark:bg-slate-900 min-h-screen transition-all duration-300"
      dir="rtl"
    >
      <Card className="border-0 shadow-lg bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-300 text-3xl font-bold transition-all duration-300">
            <FileText className="w-8 h-8" />
            لوحة تقارير الأعمال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div>
              <Label
                htmlFor="report-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                نوع التقرير
              </Label>
              <Select
                value={filterState.selectedReport}
                onValueChange={(value) =>
                  handleInputChange("SET_REPORT", value)
                }
              >
                <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300">
                  <SelectValue placeholder="اختر التقرير" />
                  {filterState.selectedReport
                    ? REPORT_TYPES[
                        filterState.selectedReport as keyof typeof REPORT_TYPES
                      ] || "اختر التقرير"
                    : "اختر التقرير"}
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg transition-all duration-300">
                  {Object.entries(REPORT_TYPES).map(([key, value]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                    >
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="date-from"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                من تاريخ
              </Label>
              <Input
                id="date-from"
                type="date"
                value={filterState.dateFrom}
                onChange={(e) =>
                  handleInputChange("SET_DATE_FROM", e.target.value)
                }
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
              />
            </div>
            <div>
              <Label
                htmlFor="date-to"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                إلى تاريخ
              </Label>
              <Input
                id="date-to"
                type="date"
                value={filterState.dateTo}
                onChange={(e) =>
                  handleInputChange("SET_DATE_TO", e.target.value)
                }
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
              />
            </div>
            {filterState.selectedReport === "sales" && (
              <div>
                <Label
                  htmlFor="group-by"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  التجميع حسب
                </Label>
                <Select
                  value={filterState.groupBy}
                  onValueChange={(value) =>
                    handleInputChange("SET_GROUP_BY", value)
                  }
                >
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300">
                    <SelectValue placeholder="اختر التجميع" />
                    {filterState.groupBy
                      ? GROUP_BY_OPTIONS[
                          filterState.groupBy as keyof typeof GROUP_BY_OPTIONS
                        ]
                      : "اختر التجميع"}
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg transition-all duration-300">
                    {Object.entries(GROUP_BY_OPTIONS).map(([key, value]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                      >
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(filterState.selectedReport === "top_selling" ||
              filterState.selectedReport === "inventory" ||
              filterState.selectedReport === "profits") && (
              <div>
                <Label
                  htmlFor="category-id"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  الفئة
                </Label>
                <Select
                  value={filterState.categoryId}
                  onValueChange={(value) =>
                    handleInputChange("SET_CATEGORY_ID", value)
                  }
                >
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300">
                    <SelectValue placeholder="اختر الفئة" />
                    {filterState.categoryId === "all"
                      ? "الكل"
                      : filterState.categoryId
                      ? categories.find(
                          (cat) => cat.id === filterState.categoryId
                        )?.name || "اختر الفئة"
                      : "اختر الفئة"}
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg transition-all duration-300">
                    <SelectItem
                      value="all"
                      className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                    >
                      الكل
                    </SelectItem>
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 dark:text-blue-400" />
                        <span className="mr-2 text-gray-600 dark:text-gray-300">
                          جارٍ تحميل الفئات...
                        </span>
                      </div>
                    ) : categories.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        لا توجد فئات متاحة
                      </div>
                    ) : (
                      categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                          className="flex items-center hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            ></span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(filterState.selectedReport === "sales" ||
              filterState.selectedReport === "performance") && (
              <div>
                <Label
                  htmlFor="user-id"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  المستخدم
                </Label>
                <Select
                  value={filterState.userId}
                  onValueChange={(value) =>
                    handleInputChange("SET_USER_ID", value)
                  }
                >
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300">
                    <SelectValue placeholder="اختر المستخدم" />
                    {filterState.userId === "all"
                      ? "الكل"
                      : filterState.userId
                      ? users.find((user) => user.id === filterState.userId)
                          ?.name || "اختر المستخدم"
                      : "اختر المستخدم"}
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg transition-all duration-300">
                    <SelectItem
                      value="all"
                      className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                    >
                      الكل
                    </SelectItem>
                    {users.map((user) => (
                      <SelectItem
                        key={user.id}
                        value={user.id}
                        className="hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-300"
                      >
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              إنشاء التقرير
            </Button>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 px-6 py-2 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5" />
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>
      {reportContent}
    </div>
  );
};

export default ReportsSection;
