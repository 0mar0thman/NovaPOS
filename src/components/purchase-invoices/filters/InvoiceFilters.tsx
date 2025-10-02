import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@radix-ui/react-label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { PurchaseInvoice, User } from "../types/types";
import { Can } from "@/components/Can";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useExportInvoices } from "../hooks/useExportInvoices";

type ExportOption = "today" | "yesterday" | "weekly" | "monthly" | "all";

interface InvoiceFiltersProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  sort: string;
  setSort: React.Dispatch<React.SetStateAction<string>>;
  paymentStatus: string;
  setPaymentStatus: React.Dispatch<React.SetStateAction<string>>;
  dateFilter: string;
  setDateFilter: React.Dispatch<React.SetStateAction<string>>;
  specificDate: string;
  setSpecificDate: React.Dispatch<React.SetStateAction<string>>;
  specificWeek: string;
  setSpecificWeek: React.Dispatch<React.SetStateAction<string>>;
  specificMonth: string;
  setSpecificMonth: React.Dispatch<React.SetStateAction<string>>;
  currentUser: User | null;
  users: User[];
  canViewAllInvoices: boolean;
  selectedUserId: string | null;
  setSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>;
  exportOption: ExportOption;
  setExportOption: React.Dispatch<React.SetStateAction<ExportOption>>;
  allInvoices: PurchaseInvoice[];
  resetDateFilters: () => void;
  getLast7Days?: { value: string; label: string }[];
  getLast4Weeks?: { value: string; label: string }[];
  getLast12Months?: { value: string; label: string }[];
}

export const InvoiceFilters = ({
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
  currentUser,
  users,
  canViewAllInvoices,
  selectedUserId,
  setSelectedUserId,
  exportOption,
  setExportOption,
  allInvoices,
  resetDateFilters,
  getLast7Days = [],
  getLast4Weeks = [],
  getLast12Months = [],
}: InvoiceFiltersProps) => {
  const { exportDialog, setExportDialog, exportToCSV } = useExportInvoices();

  // تسجيل قيمة users لتصحيح الأخطاء
  useEffect(() => {
    console.log("InvoiceFilters - users:", users);
    console.log("InvoiceFilters - currentUser:", currentUser);
    console.log("InvoiceFilters - selectedUserId:", selectedUserId);
    console.log("InvoiceFilters - exportOption:", exportOption);
  }, [users, currentUser, selectedUserId, exportOption]);

  const handleUserChange = (value: string) => {
    const newUserId =
      value === "current" && currentUser ? currentUser.id : value;
    setSelectedUserId(newUserId);
  };

  const handleExportOptionChange = (value: string) => {
    if (["today", "yesterday", "weekly", "monthly", "all"].includes(value)) {
      setExportOption(value as ExportOption);
    }
  };

  const handleExport = () => {
    exportToCSV(
      allInvoices,
      selectedUserId,
      currentUser?.id || "",
      users,
      search,
      paymentStatus,
      dateFilter,
      specificDate,
      specificWeek,
      specificMonth,
      exportOption
    );
  };

  const handleResetFilters = () => {
    setSearch("");
    setSort("latest");
    setPaymentStatus("all");
    resetDateFilters(); // Use resetDateFilters to handle date-related resets
    setSelectedUserId(currentUser?.id || null);
  };

  if (!currentUser || users.length === 0) {
    return (
      <Card
        className="pr-6 pl-6 pb-2 pt-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-blue-100 dark:border-gray-700 transition-all duration-300"
        dir="rtl"
      >
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mr-2 text-gray-600 dark:text-gray-400">
            جارٍ تحميل بيانات المستخدمين...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        className="pr-6 pl-6 pb-2 pt-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-blue-100 dark:border-gray-700 transition-all duration-300"
        dir="rtl"
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              البحث
            </Label>
            <Input
              placeholder="أدخل اسم المورد أو رقم الفاتورة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              الترتيب
            </Label>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="اختر الفرز">
                  {sort === "latest" ? "الأحدث" : "الأقدم"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem
                  value="latest"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  الأحدث
                </SelectItem>
                <SelectItem
                  value="oldest"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  الأقدم
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              حالة الدفع
            </Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="اختر حالة الدفع">
                  {paymentStatus === "all"
                    ? "الكل"
                    : paymentStatus === "fully_paid"
                    ? "مدفوع كليًا"
                    : paymentStatus === "partially_paid"
                    ? "مدفوع جزئيًا"
                    : "غير مدفوع"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  الكل
                </SelectItem>
                <SelectItem
                  value="fully_paid"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  مدفوع كليًا
                </SelectItem>
                <SelectItem
                  value="partially_paid"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  مدفوع جزئيًا
                </SelectItem>
                <SelectItem
                  value="unpaid"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  غير مدفوع
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              الفترة الزمنية
            </Label>
            <Select
              value={dateFilter}
              onValueChange={(value) => {
                setDateFilter(value);
                resetDateFilters(); // Reset date-related filters including exportOption
              }}
            >
              <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="اختر الفترة">
                  {dateFilter === "all"
                    ? "الكل"
                    : dateFilter === "today"
                    ? "اليوم"
                    : dateFilter === "week"
                    ? "هذا الأسبوع"
                    : "هذا الشهر"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem
                  value="all"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  الكل
                </SelectItem>
                <SelectItem
                  value="today"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  اليوم
                </SelectItem>
                <SelectItem
                  value="week"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  هذا الأسبوع
                </SelectItem>
                <SelectItem
                  value="month"
                  className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                >
                  هذا الشهر
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dateFilter === "today" && (
            <div>
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                اختر يومًا
              </Label>
              <Select value={specificDate} onValueChange={setSpecificDate}>
                <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="اختر يومًا" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700"> 
                  {getLast7Days.map((day) => (
                    <SelectItem
                      key={day.value}
                      value={day.value}
                      className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                    >
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {dateFilter === "week" && (
            <div>
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                اختر أسبوعًا
              </Label>
              <Select value={specificWeek} onValueChange={setSpecificWeek}>
                <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="اختر أسبوعًا" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {getLast4Weeks.map((week) => (
                    <SelectItem
                      key={week.value}
                      value={week.value}
                      className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                    >
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {dateFilter === "month" && (
            <div>
              <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                اختر شهرًا
              </Label>
              <Select value={specificMonth} onValueChange={setSpecificMonth}>
                <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="اختر شهرًا" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {getLast12Months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-end gap-3 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <Can action="read" subject="User">
              <div>
                <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  المستخدم
                </Label>
                <Select
                  value={selectedUserId || "current"}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="اختر المستخدم">
                      {selectedUserId === "all"
                        ? "جميع المستخدمين"
                        : selectedUserId
                        ? users.find((user) => user.id === selectedUserId)
                            ?.name || "غير معروف"
                        : currentUser?.name || "غير معروف"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem
                      value="current"
                      className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                    >
                      {currentUser?.name || "غير معروف"} (أنا)
                    </SelectItem>
                    {canViewAllInvoices && (
                      <SelectItem
                        value="all"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        جميع المستخدمين
                      </SelectItem>
                    )}
                    {users.length > 0 ? (
                      users
                        .filter((user) => !user.deleted_at)
                        .map((user) => (
                          <SelectItem
                            key={user.id}
                            value={user.id}
                            className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                          >
                            {user.name}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem
                        value="none"
                        disabled
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        لا يوجد مستخدمين متاحين
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </Can>

            <Can action="read" subject="User">
              <div>
                <Label className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  تصدير المشتريات
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Select
                    value={exportOption}
                    onValueChange={handleExportOptionChange}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="اختر فترة التصدير">
                        {exportOption === "all"
                          ? "الكل"
                          : exportOption === "today"
                          ? "اليوم حتى الآن"
                          : exportOption === "yesterday"
                          ? "اليوم السابق"
                          : exportOption === "weekly"
                          ? "الأسبوعي"
                          : "الشهري"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem
                        value="all"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        الكل
                      </SelectItem>
                      <SelectItem
                        value="today"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        اليوم حتى الآن
                      </SelectItem>
                      <SelectItem
                        value="yesterday"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        اليوم السابق
                      </SelectItem>
                      <SelectItem
                        value="weekly"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        الأسبوعي
                      </SelectItem>
                      <SelectItem
                        value="monthly"
                        className="dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                      >
                        الشهري
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleExport}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-gray-200"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تصدير CSV
                  </Button>
                </div>
              </div>
            </Can>

            <div>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 w-10"
              >
                <RefreshCw className="w-4 h-4" />
                {/* إعادة تعيين */}
              </Button>
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
