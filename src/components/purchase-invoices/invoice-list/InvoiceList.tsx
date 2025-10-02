import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Download, UserX, Eye, Edit, Trash2, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { PurchaseInvoice, Product, ProductOption, User } from "../types/types";
import { InvoiceTotals } from "../components/InvoiceTotals";
import { InvoiceDetailsDialog } from "../dialogs/InvoiceDetailsDialog";
import { InvoiceFormDialog } from "../dialogs/InvoiceFormDialog";
import { safeToFixed, formatDate } from "../types/utils";
import { Can } from "@/components/Can";
import { PrintLayout } from "../components/PrintTemplate/PrintLayout";

interface InvoiceListProps {
  invoices: PurchaseInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  products: Product[];
  productOptions: ProductOption[];
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  search: string;
  sort: string;
  paymentStatus: string;
  dateFilter: string;
  specificDate: string;
  specificWeek: string;
  specificMonth: string;
  selectedUserId?: string | null;
  users: User[];
  currentUser: User | null;
  handlePrint: (invoice: PurchaseInvoice) => void;
}

export const InvoiceList = ({
  invoices = [],
  setInvoices,
  products,
  productOptions,
  currentPage,
  setCurrentPage,
  search,
  sort = "desc",
  paymentStatus,
  dateFilter,
  specificDate,
  specificWeek,
  specificMonth,
  selectedUserId,
  users,
  currentUser,
  handlePrint,
}: InvoiceListProps) => {
  const [selectedInvoice, setSelectedInvoice] =
    useState<PurchaseInvoice | null>(null);
  const [selectedEditInvoice, setSelectedEditInvoice] =
    useState<PurchaseInvoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const { toast } = useToast();

  const perPage = 10;

  const fetchInvoices = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
        sort,
        include: "items.product.category,creator,cashier",
      };
      if (search) params.search = search;
      if (paymentStatus !== "all") params.payment_status = paymentStatus;
      if (dateFilter !== "all") params.date_filter = dateFilter;
      if (dateFilter === "today" && specificDate)
        params.specific_date = specificDate;
      if (dateFilter === "week" && specificWeek)
        params.specific_week = specificWeek;
      if (dateFilter === "month" && specificMonth)
        params.specific_month = specificMonth;
      if (selectedUserId && selectedUserId !== "all")
        params.cashier_id = selectedUserId;

      const response = await api.get("/api/purchase-invoices", {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const formattedInvoices = response.data.data.map((invoice: any) => ({
        ...invoice,
        cashier: invoice.cashier
          ? {
              ...invoice.cashier,
              id: String(invoice.cashier.id),
              deleted_at: invoice.cashier.deleted_at || null,
            }
          : undefined,
        creator: invoice.creator
          ? {
              ...invoice.creator,
              id: String(invoice.creator.id),
              deleted_at: invoice.creator.deleted_at || null,
            }
          : undefined,
        user_id: String(invoice.user_id),
        cashier_name: invoice.cashier_name,
        user_name: invoice.user_name,
        cashier_display_name: invoice.cashier_display_name,
        user_display_name: invoice.user_display_name,
      }));

      setInvoices(formattedInvoices || []);
      setTotalPages(response.data.last_page || 1);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء جلب الفواتير",
        variant: "destructive",
      });
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(currentPage + 1);
  }, [
    currentPage,
    search,
    sort,
    paymentStatus,
    dateFilter,
    specificDate,
    specificWeek,
    specificMonth,
    selectedUserId,
  ]);

  const handleView = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  const handleEdit = (invoice: PurchaseInvoice) => {
    setSelectedEditInvoice(invoice);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/purchase-invoices/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      toast({
        title: "تم الحذف",
        description: "تم حذف الفاتورة بنجاح",
      });
      fetchInvoices(currentPage + 1);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الفاتورة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrintInvoice = (invoice: PurchaseInvoice) => {
    if (!currentUser) {
      toast({
        title: "خطأ",
        description: "بيانات المستخدم الحالي غير متوفرة",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert id to number for PrintLayout
      const userForPrint = {
        id: (currentUser.id),
        name: currentUser.name,
      };
      const result = PrintLayout(invoice, userForPrint);
      if (result.includes("فشل")) {
        toast({
          title: "خطأ في الطباعة",
          description: result,
          variant: "destructive",
        });
      } else {
        toast({
          title: "نجاح",
          description: result,
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error during printing:", error);
      toast({
        title: "خطأ في الطباعة",
        description: "حدث خطأ أثناء محاولة الطباعة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card
      className="p-1 mt-1 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border-blue-100 dark:border-slate-700 rounded-xl shadow-lg"
      dir="rtl"
    >
      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <Receipt className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-500" />
          <p className="text-lg font-semibold">لا توجد فواتير مشتريات</p>
          <p className="text-sm mt-2 max-w-md text-center">
            ستظهر الفواتير هنا بعد إتمام عمليات الشراء
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl shadow-lg">
            <Table className="w-full text-sm" role="grid">
              <TableHeader className="sticky top-0 bg-gray-100 dark:bg-slate-900 z-10">
                <TableRow className="border-b border-gray-200 dark:border-slate-700">
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[50px]">
                    #
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[120px]">
                    رقم الفاتورة
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[150px]">
                    اسم المورد
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[120px] hidden md:table-cell">
                    هاتف المورد
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    التاريخ
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[150px]">
                    المستلم
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    عدد المنتجات
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    الإجمالي
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    المدفوع
                  </TableHead>
                  <TableHead className="font-semibold text-right text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    المتبقي
                  </TableHead>
                  <TableHead className="font-semibold text-center text-gray-800 dark:text-gray-100 py-2 px-5 w-[100px]">
                    حالة الدفع
                  </TableHead>
                  <TableHead className="font-semibold text-center text-gray-800 dark:text-gray-100 py-2 px-5 w-[180px]">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice, index) => (
                  <TableRow
                    key={invoice.id}
                    className={`border-b border-gray-200 dark:border-slate-700 transition-colors ${
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-800"
                        : "bg-gray-50 dark:bg-slate-900/50"
                    } hover:bg-gray-100 dark:hover:bg-slate-700/50`}
                    onClick={() => handleView(invoice)}
                  >
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5">
                      {invoices.length - index}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium dark:text-gray-200 py-3 px-5">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell
                      className="text-sm text-right dark:text-gray-300 py-3 px-5 truncate"
                      title={invoice.supplier?.name}
                    >
                      {invoice.supplier?.name || "غير محدد"}
                    </TableCell>
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5 hidden md:table-cell">
                      {invoice.supplier?.phone || "غير محدد"}
                    </TableCell>
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5">
                      {formatDate(invoice.date)}
                    </TableCell>
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5">
                      <span>
                        {invoice.cashier_display_name ||
                          invoice.user_display_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5">
                      {invoice.items?.length || 0}
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold dark:text-gray-200 py-3 px-5">
                      {safeToFixed(invoice.total_amount)} ج.م
                    </TableCell>
                    <TableCell className="text-sm text-right dark:text-gray-300 py-3 px-5">
                      {safeToFixed(invoice.amount_paid)} ج.م
                    </TableCell>
                    <TableCell className="text-sm text-right font-semibold dark:text-gray-200 py-3 px-5">
                      {safeToFixed(invoice.total_amount - invoice.amount_paid)} ج.م
                    </TableCell>
                    <TableCell className="text-center py-3 px-5">
                      <Badge
                        variant={
                          invoice.amount_paid >= invoice.total_amount
                            ? "default"
                            : invoice.amount_paid > 0
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs px-3 py-1 rounded-full font-medium"
                      >
                        {invoice.amount_paid >= invoice.total_amount
                          ? "مدفوع"
                          : invoice.amount_paid > 0
                          ? "جزئي"
                          : "غير مدفوع"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center py-3 px-5">
                      <div className="flex md:flex-row flex-col justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(invoice)}
                          className="h-9 w-9 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors rounded-full"
                          title="عرض التفاصيل"
                          aria-label="عرض تفاصيل الفاتورة"
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                        <Can action="update" subject="PurchaseInvoice">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                            className="h-9 w-9 p-0 text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors rounded-full"
                            title="تعديل الفاتورة"
                            aria-label="تعديل الفاتورة"
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                        </Can>
                        {/* <Can action="print" subject="PurchaseInvoice"> */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(invoice)}
                            className="h-9 w-9 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/30 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors rounded-full"
                            title="طباعة الفاتورة"
                            aria-label="طباعة الفاتورة"
                          >
                            <Printer className="w-5 h-5" />
                          </Button>
                        {/* </Can> */}
                        <Can action="delete" subject="PurchaseInvoice">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(invoice.id)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors rounded-full"
                            disabled={isLoading}
                            title="حذف الفاتورة"
                            aria-label="حذف الفاتورة"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <InvoiceTotals
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
      <InvoiceDetailsDialog
        invoice={selectedInvoice}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
      <InvoiceFormDialog
        invoice={selectedEditInvoice}
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={() => fetchInvoices(currentPage + 1)}
        products={products}
        productOptions={productOptions}
        setInvoices={setInvoices}
      />
    </Card>
  );
};