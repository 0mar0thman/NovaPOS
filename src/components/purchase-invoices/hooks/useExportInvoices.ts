import { useState } from "react";
import { parseISO, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { PurchaseInvoice, User } from "../types/types";

type ExportOption = "today" | "yesterday" | "weekly" | "monthly" | "all";

interface ExportDialog {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error";
}

export const useExportInvoices = () => {
  const [exportDialog, setExportDialog] = useState<ExportDialog>({
    open: false,
    title: "",
    message: "",
    type: "success",
  });

  const exportToCSV = (
    invoices: PurchaseInvoice[],
    selectedUserId: string | null,
    currentUserId: string,
    users: User[],
    search: string,
    paymentStatus: string,
    dateFilter: string,
    specificDate: string,
    specificWeek: string,
    specificMonth: string,
    exportOption: ExportOption
  ) => {
    let filteredInvoices = [...invoices];

    // تصفية حسب المستخدم المحدد
    if (selectedUserId && selectedUserId !== "all") {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => invoice.cashier?.id === selectedUserId || String(invoice.user_id) === selectedUserId
      );
    } else if (!selectedUserId && currentUserId) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => invoice.cashier?.id === currentUserId || String(invoice.user_id) === currentUserId
      );
    }

    // تصفية حسب البحث
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredInvoices = filteredInvoices.filter(
        (invoice) =>
          invoice.supplier?.name?.toLowerCase().includes(searchTerm) ||
          invoice.invoice_number?.toLowerCase().includes(searchTerm)
      );
    }

    // تصفية حسب حالة الدفع
    if (paymentStatus !== "all") {
      filteredInvoices = filteredInvoices.filter((invoice) => {
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

    // تصفية حسب التاريخ (إذا تم تحديد dateFilter)
    if (dateFilter !== "all") {
      filteredInvoices = filteredInvoices.filter((invoice) => {
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

    // تصفية حسب خيار التصدير (اليوم، اليوم السابق، الأسبوعي، الشهري)
    if (exportOption !== "all") {
      const today = new Date();
      let start: Date, end: Date;

      switch (exportOption) {
        case "today":
          start = startOfDay(today);
          end = new Date();
          filteredInvoices = filteredInvoices.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "yesterday":
          start = startOfDay(subDays(today, 1));
          end = endOfDay(subDays(today, 1));
          filteredInvoices = filteredInvoices.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "weekly":
          start = startOfWeek(today, { weekStartsOn: 0 });
          end = endOfWeek(today, { weekStartsOn: 0 });
          filteredInvoices = filteredInvoices.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
        case "monthly":
          start = startOfMonth(today);
          end = endOfMonth(today);
          filteredInvoices = filteredInvoices.filter((invoice) =>
            isWithinInterval(parseISO(invoice.date), { start, end })
          );
          break;
      }
    }

    if (filteredInvoices.length === 0) {
      setExportDialog({
        open: true,
        title: "خطأ",
        message: "لا توجد فواتير للتصدير بناءً على الفلاتر المحددة",
        type: "error",
      });
      return;
    }

    const csvContent = [
      "\uFEFF" + [
        "رقم الفاتورة",
        "التاريخ",
        "اسم المورد",
        "الإجمالي",
        "المدفوع",
        "حالة الدفع",
        "اسم البائع",
        "اسم المنتج",
        "الكمية",
        "سعر الوحدة",
      ].join(","),
      ...filteredInvoices.flatMap((invoice) =>
        (invoice.items || []).map((item, index) => [
          index === 0 ? `"${invoice.invoice_number || "غير محدد"}"` : "",
          index === 0 ? `"${invoice.date}"` : "",
          index === 0 ? `"${invoice.supplier?.name || "غير معروف"}"` : "",
          index === 0 ? invoice.total_amount.toFixed(2) : "",
          index === 0 ? invoice.amount_paid.toFixed(2) : "",
          index === 0
            ? `"${
                invoice.amount_paid >= invoice.total_amount
                  ? "مدفوع كليًا"
                  : invoice.amount_paid > 0
                  ? "مدفوع جزئيًا"
                  : "غير مدفوع"
              }"`
            : "",
          index === 0 ? `"${invoice.cashier?.name || invoice.cashier_name || "غير معروف"}"` : "",
          `"${item.product?.name || "غير معروف"}"`,
          item.quantity.toString(),
          item.unit_price.toFixed(2),
        ].join(","))
      )].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportDialog({
      open: true,
      title: "تم التصدير",
      message: "تم تصدير الفواتير بنجاح إلى ملف CSV",
      type: "success",
    });
  };

  return { exportDialog, setExportDialog, exportToCSV };
};