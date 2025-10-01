import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { SalesInvoice } from "./SalesInvoices";

import { FileText } from "lucide-react";

interface Invoice {
  id: number;
  invoice_number: string;
  date: string;
  time?: string; 
  total_amount: number;
  paid_amount: number;
  status: string;
}

interface CustomerInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  selectedInvoice?: SalesInvoice; // أضفنا الفاتورة المختارة
}

const CustomerInvoicesDialog = ({
  open,
  onOpenChange,
  customerId,
  selectedInvoice,
}: CustomerInvoicesDialogProps) => {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 5;
  const { toast } = useToast();

  const totalInvoices = allInvoices.length;
  const totalAmount = allInvoices.reduce(
    (sum, inv) => sum + Number(inv.total_amount),
    0
  );

  // بيانات الصفحة الحالية
  const currentPageInvoices = allInvoices.slice(
    (page - 1) * perPage,
    page * perPage
  );

  useEffect(() => {
    const fetchAllInvoices = async () => {
      if (!customerId) return;
      try {
        setIsLoading(true);
        let pageNum = 1;
        let lastPage = 1;
        let invoices: Invoice[] = [];

        do {
          const res = await api.get(`/api/customers/${customerId}/invoices`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
            params: { page: pageNum, per_page: 50 }, // بنجيب 50 فاتورة في المرة
          });

          const data = res.data.data;
          invoices = [...invoices, ...data.data];
          lastPage = data.last_page || 1;
          pageNum++;
        } while (pageNum <= lastPage);

        // ترتيب من الأحدث للأقدم
        invoices.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setAllInvoices(invoices);
      } catch (error: any) {
        console.error("Error fetching invoices:", error);
        toast({
          title: "خطأ",
          description:
            error.response?.data?.message || "فشل تحميل فواتير العميل",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (open && customerId) {
      fetchAllInvoices();
    }
  }, [open, customerId, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white max-h-[90vh] overflow-y-auto dark:bg-slate-800">
        <DialogTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          فواتير العميل
        </DialogTitle>
        <DialogDescription>عرض جميع فواتير العميل مع الإحصائيات.</DialogDescription>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : totalInvoices === 0 ? (
          <div className="text-center py-12 text-gray-500">لا توجد فواتير</div>
        ) : (
          <>
            {/* الإحصائيات */}
            <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm flex justify-between">
              <p>عدد الفواتير الكلي: <strong>{totalInvoices}</strong></p>
              <p>إجمالي المبالغ: <strong>{totalAmount.toFixed(2)} ج.م</strong></p>
            </div>

            {/* الجدول */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المبلغ المدفوع</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageInvoices.map((invoice, index) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      {totalInvoices - ((page - 1) * perPage + index)}
                    </TableCell>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell> {format(parseISO(invoice.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{Number(invoice.total_amount).toFixed(2)} ج.م</TableCell>
                    <TableCell>{Number(invoice.paid_amount).toFixed(2)} ج.م</TableCell>
                    <TableCell>
                      {invoice.total_amount === invoice.paid_amount
                        ? "مكتمل الدفع"
                        : invoice.paid_amount > 0
                        ? "غير مكتمل الدفع"
                        : "غير مدفوع"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* أزرار التنقل */}
            <div className="flex justify-between items-center mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                السابق
              </button>
              <span className="text-sm">
                الصفحة {page} من {Math.ceil(totalInvoices / perPage)}
              </span>
              <button
                disabled={page === Math.ceil(totalInvoices / perPage)}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInvoicesDialog;
