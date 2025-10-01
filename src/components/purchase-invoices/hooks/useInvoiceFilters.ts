import { useState, useEffect, useMemo, useCallback } from "react";
import { parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { PurchaseInvoice, User } from "../types/types";

type ExportOption = "today" | "yesterday" | "weekly" | "monthly" | "all";

interface UseInvoiceFiltersProps {
  allInvoices: PurchaseInvoice[];
  currentUser: User | null;
  users: User[];
  canViewAllInvoices: boolean;
}

export const useInvoiceFilters = ({
  allInvoices,
  currentUser,
  users,
  canViewAllInvoices,
}: UseInvoiceFiltersProps) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [specificDate, setSpecificDate] = useState("");
  const [specificWeek, setSpecificWeek] = useState("");
  const [specificMonth, setSpecificMonth] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [exportOption, setExportOption] = useState<ExportOption>("all");
  const [filteredInvoices, setFilteredInvoices] = useState<PurchaseInvoice[]>([]);

  // تسجيل users و currentUser لتصحيح الأخطاء
  useEffect(() => {
    console.log("useInvoiceFilters - users:", users);
    console.log("useInvoiceFilters - currentUser:", currentUser);
    console.log("useInvoiceFilters - selectedUserId:", selectedUserId);
    console.log("useInvoiceFilters - exportOption:", exportOption);
    if (currentUser) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser, users]);

  // فلترة الفواتير
  useEffect(() => {
    let filtered = [...allInvoices];

    // تصفية حسب المستخدم المحدد
    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter(
        (invoice) => invoice.cashier?.id === selectedUserId || String(invoice.user_id) === selectedUserId
      );
    } else if (!canViewAllInvoices && currentUser) {
      filtered = filtered.filter(
        (invoice) => invoice.cashier?.id === currentUser.id || String(invoice.user_id) === currentUser.id
      );
    }

    // تصفية حسب البحث
    if (search) {
      const searchTerm = search.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.supplier?.name?.toLowerCase().includes(searchTerm) ||
          invoice.invoice_number?.toLowerCase().includes(searchTerm)
      );
    }

    // تصفية حسب حالة الدفع
    if (paymentStatus !== "all") {
      filtered = filtered.filter((invoice) => {
        if (paymentStatus === "fully_paid") {
          return invoice.amount_paid >= invoice.total_amount;
        } else if (paymentStatus === "partially_paid") {
          return invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_amount;
        } else if (paymentStatus === "unpaid") {
          return invoice.amount_paid === 0;
        }
        return true;
      });
    }

    // تصفية حسب خيار التصدير (اليوم، اليوم السابق، الأسبوعي، الشهري)
    if (exportOption !== "all") {
      const today = new Date();
      let start: Date, end: Date;

      switch (exportOption) {
        case "today":
          start = startOfDay(today);
          end = new Date();
          filtered = filtered.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "yesterday":
          start = startOfDay(subDays(today, 1));
          end = endOfDay(subDays(today, 1));
          filtered = filtered.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "weekly":
          start = startOfWeek(today, { weekStartsOn: 0 });
          end = endOfWeek(today, { weekStartsOn: 0 });
          filtered = filtered.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "monthly":
          start = startOfMonth(today);
          end = endOfMonth(today);
          filtered = filtered.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
      }
    }

    // تصفية حسب التاريخ (إذا تم تحديد dateFilter)
    if (dateFilter !== "all") {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = parseISO(invoice.date);
        let start: Date, end: Date;
        const now = new Date();

        switch (dateFilter) {
          case "today":
            if (specificDate) {
              start = startOfDay(parseISO(specificDate));
              end = endOfDay(parseISO(specificDate));
            } else {
              start = startOfDay(now);
              end = endOfDay(now);
            }
            return isWithinInterval(invoiceDate, { start, end });
          case "week":
            if (specificWeek) {
              const [startStr, endStr] = specificWeek.split("_");
              start = startOfDay(parseISO(startStr));
              end = endOfDay(parseISO(endStr));
            } else {
              start = startOfWeek(now);
              end = endOfWeek(now);
            }
            return isWithinInterval(invoiceDate, { start, end });
          case "month":
            if (specificMonth) {
              const [year, month] = specificMonth.split("-").map(Number);
              start = startOfMonth(new Date(year, month - 1));
              end = endOfMonth(new Date(year, month - 1));
            } else {
              start = startOfMonth(now);
              end = endOfMonth(now);
            }
            return isWithinInterval(invoiceDate, { start, end });
          default:
            return true;
        }
      });
    }

    // ترتيب الفواتير
    if (sort === "latest") {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sort === "oldest") {
      filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    setFilteredInvoices(filtered);
  }, [
    allInvoices,
    selectedUserId,
    currentUser,
    canViewAllInvoices,
    search,
    paymentStatus,
    dateFilter,
    specificDate,
    specificWeek,
    specificMonth,
    exportOption,
    sort,
  ]);

  const handleUserChange = useCallback(
    (value: string) => {
      const newUserId = value === "current" && currentUser ? currentUser.id : value;
      setSelectedUserId(newUserId);
    },
    [currentUser]
  );

  const resetDateFilters = useCallback(() => {
    setSpecificDate("");
    setSpecificWeek("");
    setSpecificMonth("");
    setExportOption("all"); // إعادة تعيين خيار التصدير إلى "الكل"
  }, []);

  const getLast7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
      days.push({ value: dateString, label: date.toLocaleDateString("ar-EG") });
    }
    return days;
  }, []);

  const getLast4Weeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - i * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const weekString = `${startOfWeek.toISOString().split("T")[0]}_${endOfWeek.toISOString().split("T")[0]}`;
      weeks.push({
        value: weekString,
        label: `من ${startOfWeek.toLocaleDateString("ar-EG")} إلى ${endOfWeek.toLocaleDateString("ar-EG")}`,
      });
    }
    return weeks;
  }, []);

  const getLast12Months = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      months.push({
        value: monthString,
        label: date.toLocaleString("ar-EG", { month: "long", year: "numeric" }),
      });
    }
    return months;
  }, []);

  return {
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
    selectedUserId,
    setSelectedUserId: handleUserChange,
    exportOption,
    setExportOption,
    filteredInvoices,
    resetDateFilters,
    getLast7Days,
    getLast4Weeks,
    getLast12Months,
  };
};