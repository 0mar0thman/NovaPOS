import { Dispatch, SetStateAction, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { SalesInvoice } from "./SalesInvoices";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  isWithinInterval,
} from "date-fns";
import { Can } from "@/components/Can";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle } from "lucide-react";

// تعريف أنواع البيانات
type PaymentStatus = "paid" | "partial" | "unpaid";
type ExportOption = "today" | "yesterday" | "weekly" | "monthly";
type CustomerType = "all" | "عميل فوري" | "other";
type PaginationMode = "daily" | "weekly" | "monthly" | "all";

interface User {
  id: string;
  name: string;
}

interface FiltersProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  sort: "desc" | "asc";
  setSort: Dispatch<SetStateAction<"desc" | "asc">>;
  paymentStatus: PaymentStatus | "all";
  setPaymentStatus: Dispatch<SetStateAction<PaymentStatus | "all">>;
  dateFilter: PaginationMode;
  setDateFilter: Dispatch<SetStateAction<PaginationMode>>;
  specificDate: string;
  setSpecificDate: Dispatch<SetStateAction<string>>;
  specificWeek: string;
  setSpecificWeek: Dispatch<SetStateAction<string>>;
  specificMonth: string;
  setSpecificMonth: Dispatch<SetStateAction<string>>;
  resetDateFilters: () => void;
  getLast7Days: () => { value: string; label: string }[];
  getLast4Weeks: () => { value: string; label: string }[];
  getLast12Months: () => { value: string; label: string }[];
  canViewAllInvoices: boolean;
  currentUser: User | null;
  users: User[];
  setSelectedUserId: Dispatch<SetStateAction<string | null>>;
  selectedUserId: string | null;
  allInvoices: SalesInvoice[];
  customerType: CustomerType;
  setCustomerType: Dispatch<SetStateAction<CustomerType>>;
}

const exportToCSV = (
  invoices: SalesInvoice[],
  exportOption: ExportOption,
  selectedUserId: string | null,
  currentUserId: string,
  setExportDialog: Dispatch<
    SetStateAction<{
      open: boolean;
      title: string;
      message: string;
      type: string;
    }>
  >
) => {
  const today = new Date();
  let filteredInvoices = invoices;
  let start: Date, end: Date;

  if (selectedUserId && selectedUserId !== "all") {
    filteredInvoices = filteredInvoices.filter(
      (invoice) => invoice.cashier?.id === selectedUserId
    );
  } else if (!selectedUserId || selectedUserId === "all") {
    filteredInvoices = filteredInvoices.filter(
      (invoice) => invoice.cashier?.id === currentUserId
    );
  }

  switch (exportOption) {
    case "today":
      start = startOfDay(today);
      end = new Date();
      filteredInvoices = filteredInvoices.filter((invoice) =>
        isWithinInterval(new Date(invoice.date), { start, end })
      );
      break;
    case "yesterday":
      start = startOfDay(subDays(today, 1));
      end = endOfDay(subDays(today, 1));
      filteredInvoices = filteredInvoices.filter((invoice) =>
        isWithinInterval(new Date(invoice.date), { start, end })
      );
      break;
    case "weekly":
      start = startOfWeek(today, { weekStartsOn: 0 });
      end = endOfWeek(today, { weekStartsOn: 0 });
      filteredInvoices = filteredInvoices.filter((invoice) =>
        isWithinInterval(new Date(invoice.date), { start, end })
      );
      break;
    case "monthly":
      start = startOfMonth(today);
      end = endOfMonth(today);
      filteredInvoices = filteredInvoices.filter((invoice) =>
        isWithinInterval(new Date(invoice.date), { start, end })
      );
      break;
  }

  if (filteredInvoices.length === 0) {
    setExportDialog({
      open: true,
      title: "لا توجد فواتير",
      message:
        "لا توجد فواتير لتصديرها في هذه الفترة الزمنية أو للمستخدم المحدد.",
      type: "error",
    });
    return;
  }

  const headers = [
    "رقم الفاتورة",
    "التاريخ",
    "الوقت",
    "اسم العميل",
    "رقم الهاتف",
    "الإجمالي",
    "المدفوع",
    "الحالة",
    "طريقة الدفع",
    "اسم البائع",
    "المنتجات",
  ];

  const rows = filteredInvoices.map((invoice) => {
    const totalAmount =
      typeof invoice.total_amount === "number"
        ? invoice.total_amount.toFixed(2)
        : "0.00";
    const paidAmount =
      typeof invoice.paid_amount === "number"
        ? invoice.paid_amount.toFixed(2)
        : "0.00";
    const timeValue = invoice.time || "--:--";

    return [
      `"${invoice.invoice_number || "غير محدد"}"`,
      `"${format(new Date(invoice.date), "yyyy-MM-dd")}"`,
      `"=\"${timeValue}\""`,
      `"${invoice.customer_name || "غير محدد"}"`,
      `"${invoice.phone || "غير محدد"}"`,
      `"${totalAmount}"`,
      `"${paidAmount}"`,
      `"${
        invoice.status === "paid"
          ? "مدفوعة"
          : invoice.status === "partial"
          ? "جزئي"
          : "غير مدفوعة"
      }"`,
      `"${invoice.payment_method || "غير محدد"}"`,
      `"${invoice.cashier?.name || "غير معروف"}"`,
      `"${invoice.items
        .map(
          (item) =>
            `${item.name} (${item.quantity} × ${Number(item.unit_price).toFixed(
              2
            )})`
        )
        .join("; ")}"`,
    ];
  });

  const csvContent = [
    "\uFEFF" + headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `invoices_${exportOption}_${selectedUserId || currentUserId}_${format(
      today,
      "yyyyMMdd"
    )}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setExportDialog({
    open: true,
    title: "تم التصدير بنجاح",
    message: `تم تصدير ${filteredInvoices.length} فاتورة بنجاح.`,
    type: "success",
  });
};

const Filters = ({
  search,
  setSearch,
  sort,
  setSort,
  paymentStatus,
  setPaymentStatus,
  dateFilter,
  setDateFilter,
  specificDate,
  setSpecificDate,
  specificWeek,
  setSpecificWeek,
  specificMonth,
  setSpecificMonth,
  resetDateFilters,
  getLast7Days,
  getLast4Weeks,
  getLast12Months,
  canViewAllInvoices,
  currentUser,
  users,
  setSelectedUserId,
  selectedUserId,
  allInvoices,
  customerType,
  setCustomerType,
}: FiltersProps) => {
  const [exportOption, setExportOption] = useState<ExportOption>("today");
  const [exportDialog, setExportDialog] = useState({
    open: false,
    title: "",
    message: "",
    type: "info", // 'info', 'success', 'error'
  });

  // دالة إعادة التعيين
  const handleResetFilters = () => {
    setSearch("");
    setSort("desc");
    setPaymentStatus("all");
    setCustomerType("all");
    resetDateFilters();
    setSelectedUserId(currentUser?.id || "all");
  };

  const handleExportOptionChange = (value: string) => {
    if (["today", "yesterday", "weekly", "monthly"].includes(value)) {
      setExportOption(value as ExportOption);
    }
  };

  const handleUserChange = (value: string) => {
    if (value === "current" && currentUser) {
      setSelectedUserId(currentUser.id);
    } else if (value === "all") {
      setSelectedUserId("all");
    } else {
      setSelectedUserId(value);
    }
  };

  const handleCustomerTypeChange = (value: string) => {
    if (["all", "عميل فوري", "other"].includes(value)) {
      setCustomerType(value as CustomerType);
    }
  };

  const handleSortChange = (value: string) => {
    if (value === "desc" || value === "asc") {
      setSort(value);
    }
  };

  const handleDateFilterChange = (value: string) => {
    if (["daily", "weekly", "monthly", "all"].includes(value)) {
      setDateFilter(value as PaginationMode);
    }
  };

  const handleExport = () => {
    exportToCSV(
      allInvoices,
      exportOption,
      selectedUserId,
      currentUser?.id || "",
      setExportDialog
    );
  };

  if (!currentUser) {
    return (
      <Card
        className="p-4 bg-white/60 dark:bg-slate-800 backdrop-blur-sm border-blue-100 dark:border-slate-700 transition-all duration-300"
        dir="rtl"
      >
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        className="p-4 bg-white/60 dark:bg-slate-800 backdrop-blur-sm border-blue-100 dark:border-slate-700 transition-all duration-300"
        dir="rtl"
      >
        <div className="space-y-4">
          {/* الصف الأول: الفلاتر الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                البحث
              </Label>
              <Input
                placeholder="ابحث باسم المنتج او رقم الفاتورة او رقم العميل او اسم العميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                الترتيب
              </Label>
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                  <SelectValue placeholder="اختر الترتيب">
                    {sort === "desc" ? "الأحدث" : "الأقدم"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem
                    value="desc"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    الأحدث
                  </SelectItem>
                  <SelectItem
                    value="asc"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    الأقدم
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                حالة الدفع
              </Label>
              <Select value={paymentStatus} onValueChange={(value) => setPaymentStatus(value as PaymentStatus | "all")}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                  <SelectValue placeholder="اختر حالة الدفع">
                    {paymentStatus === "all"
                      ? "الكل"
                      : paymentStatus === "paid"
                      ? "مدفوعة"  
                      : paymentStatus === "partial"
                      ? "جزئي"
                      : "غير مدفوعة"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem
                    value="all"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    الكل
                  </SelectItem>
                  <SelectItem
                    value="paid"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    مدفوعة
                  </SelectItem>
                  <SelectItem
                    value="partial"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    جزئي
                  </SelectItem>
                  <SelectItem
                    value="unpaid"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    غير مدفوعة
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                نوع العميل
              </Label>
              <Select value={customerType} onValueChange={handleCustomerTypeChange}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                  <SelectValue placeholder="اختر نوع العميل">
                    {customerType === "all"
                      ? "الكل"
                      : customerType === "عميل فوري"
                      ? "عميل فوري"
                      : "عملاء آخرون"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem
                    value="all"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    الكل
                  </SelectItem>
                  <SelectItem
                    value="عميل فوري"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    عميل فوري
                  </SelectItem>
                  <SelectItem
                    value="other"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    عملاء آخرون
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                الفترة الزمنية
              </Label>
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                  <SelectValue placeholder="اختر الفترة">
                    {dateFilter === "all"
                      ? "الكل"
                      : dateFilter === "daily"
                      ? "يومي"
                      : dateFilter === "weekly"
                      ? "أسبوعي"
                      : "شهري"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem
                    value="all"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    الكل
                  </SelectItem>
                  <SelectItem
                    value="daily"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    يومي
                  </SelectItem>
                  <SelectItem
                    value="weekly"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    أسبوعي
                  </SelectItem>
                  <SelectItem
                    value="monthly"
                    className="dark:hover:bg-slate-600 dark:text-gray-200"
                  >
                    شهري
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* الصف الثاني: الفلاتر الزمنية المحددة */}
          {dateFilter !== "all" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                  اختر الفترة الزمنية
                </Label>
                {dateFilter === "daily" && (
                  <Select value={specificDate} onValueChange={setSpecificDate}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue placeholder="اختر يومًا" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                      {getLast7Days().map((day) => (
                        <SelectItem
                          key={day.value}
                          value={day.value}
                          className="dark:hover:bg-slate-600 dark:text-gray-200"
                        >
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {dateFilter === "weekly" && (
                  <Select value={specificWeek} onValueChange={setSpecificWeek}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue placeholder="اختر أسبوعًا" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                      {getLast4Weeks().map((week) => (
                        <SelectItem
                          key={week.value}
                          value={week.value}
                          className="dark:hover:bg-slate-600 dark:text-gray-200"
                        >
                          {week.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {dateFilter === "monthly" && (
                  <Select value={specificMonth} onValueChange={setSpecificMonth}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue placeholder="اختر شهرًا" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                      {getLast12Months().map((month) => (
                        <SelectItem
                          key={month.value}
                          value={month.value}
                          className="dark:hover:bg-slate-600 dark:text-gray-200"
                        >
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* الصف الثالث: المستخدم والتصدير */}
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
              <Can action="read" subject="User">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    المستخدم
                  </Label>
                  <Select value={selectedUserId || "current"} onValueChange={handleUserChange}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue placeholder="اختر المستخدم">
                        {selectedUserId === "all"
                          ? "جميع المستخدمين"
                          : selectedUserId
                          ? users.find((user) => user.id === selectedUserId)?.name || "غير معروف"
                          : currentUser?.name || "غير معروف"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                      <SelectItem
                        value="current"
                        className="dark:hover:bg-slate-600 dark:text-gray-200"
                      >
                        {currentUser?.name || "غير معروف"} (أنا)
                      </SelectItem>
                      {canViewAllInvoices && (
                        <SelectItem
                          value="all"
                          className="dark:hover:bg-slate-600 dark:text-gray-200"
                        >
                          جميع المستخدمين
                        </SelectItem>
                      )}
                      {users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem
                            key={user.id}
                            value={user.id}
                            className="dark:hover:bg-slate-600 dark:text-gray-200"
                          >
                            {user.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem
                          value="none"
                          disabled
                          className="dark:hover:bg-slate-600 dark:text-gray-200"
                        >
                          لا يوجد مستخدمين متاحين
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </Can>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  تصدير المبيعات
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={exportOption} onValueChange={handleExportOptionChange}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue placeholder="اختر فترة التصدير">
                        {exportOption === "today"
                          ? "اليوم حتى الآن"
                          : exportOption === "yesterday"
                          ? "اليوم السابق"
                          : exportOption === "weekly"
                          ? "الأسبوعي"
                          : "الشهري"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                      <SelectItem
                        value="today"
                        className="dark:hover:bg-slate-600 dark:text-gray-200"
                      >
                        اليوم حتى الآن
                      </SelectItem>
                      <SelectItem
                        value="yesterday"
                        className="dark:hover:bg-slate-600 dark:text-gray-200"
                      >
                        اليوم السابق
                      </SelectItem>
                      <SelectItem
                        value="weekly"
                        className="dark:hover:bg-slate-600 dark:text-gray-200"
                      >
                        الأسبوعي
                      </SelectItem>
                      <SelectItem
                        value="monthly"
                        className="dark:hover:bg-slate-600 dark:text-gray-200"
                      >
                        الشهري
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleExport}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-gray-200 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تصدير CSV
                  </Button>
                </div>
              </div>

              {/* <div className="flex justify-end lg:justify-start">
                <Button
                  onClick={handleResetFilters}
                  variant="outline"
                  className="border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  إعادة تعيين
                </Button>
              </div> */}
            </div>
          </div>
        </div>
      </Card>

      <Dialog
        open={exportDialog.open}
        onOpenChange={(open) => setExportDialog({ ...exportDialog, open })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportDialog.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : exportDialog.type === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Download className="h-5 w-5 text-blue-500" />
              )}
              {exportDialog.title}
            </DialogTitle>
            <DialogDescription>{exportDialog.message}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => setExportDialog({ ...exportDialog, open: false })}
              variant={
                exportDialog.type === "error" ? "destructive" : "default"
              }
            >
              حسناً
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Filters;