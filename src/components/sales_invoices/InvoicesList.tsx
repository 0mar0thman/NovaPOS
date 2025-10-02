import { useState, useContext } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Calendar, User, Printer, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { SalesInvoice, Cashier, PaymentStatus } from "./SalesInvoices";
import { AbilityContext } from "@/config/ability";
import { Can } from '@/components/Can';

interface InvoicesListProps {
  invoices: SalesInvoice[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  getPaymentStatusColor: (status: PaymentStatus) => string;
  getPaymentStatusText: (status: PaymentStatus) => string;
  formatDate: (dateString: string) => string;
  currentUser: Cashier | null;
  onInvoiceClick: (invoice: SalesInvoice) => void;
  onPrintClick: (invoice: SalesInvoice) => void;
  setPrintDialogOpen: (open: boolean) => void;
  setIsInvoiceDialogOpen: (open: boolean) => void;
  getPaymentMethodDetails: (method: string) => {
    icon: JSX.Element;
    text: string;
    color: string;
  };
  onDeleteClick: (invoice: SalesInvoice) => void;
  canViewAllInvoices: boolean;
}

const InvoicesList = ({
  invoices,
  totalPages,
  currentPage,
  setCurrentPage,
  getPaymentStatusColor,
  getPaymentStatusText,
  formatDate,
  currentUser,
  onInvoiceClick,
  onPrintClick,
  setPrintDialogOpen,
  setIsInvoiceDialogOpen,
  getPaymentMethodDetails,
  onDeleteClick,
  canViewAllInvoices,
}: InvoicesListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<SalesInvoice | null>(null);
  const ability = useContext(AbilityContext);

  const filteredInvoices = canViewAllInvoices
    ? invoices
    : invoices.filter((invoice) => invoice.user_id === Number(currentUser?.id));

  return (
    <>
      <Card className="space-y-2 bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 p-2 rounded-md">
        {(!currentUser || filteredInvoices.length === 0) ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>لا توجد فواتير مبيعات</p>
            <p className="text-sm mt-2">
              {currentUser
                ? "ستظهر الفواتير هنا بعد إتمام عمليات البيع"
                : "يرجى تسجيل الدخول لعرض الفواتير"}
            </p>
          </div>
        ) : (
          <>
            {filteredInvoices.map((invoice) => {
              const paymentMethod = getPaymentMethodDetails(invoice.payment_method || "cash");
              return (
                <Card
                  key={invoice.id}
                  className={`border-blue-200 dark:border-slate-600 dark:bg-slate-900/100 hover:shadow-md dark:hover:shadow-slate-700 transition-all duration-200 cursor-pointer ${
                    invoice.status === "paid"
                      ? "border-green-200 dark:border-green-800"
                      : invoice.status === "partial"
                      ? "border-yellow-200 dark:border-yellow-800"
                      : "border-red-200 dark:border-red-800"
                  }`}
                  onClick={() => {
                    onInvoiceClick(invoice);
                    setIsInvoiceDialogOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500"
                          >
                            {invoice.invoice_number}
                          </Badge>
                          <Badge
                            className={`text-xs ${getPaymentStatusColor(
                              invoice.status
                            )} hover:bg-transparent dark:hover:bg-transparent`}
                          >
                            {getPaymentStatusText(invoice.status)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${paymentMethod.color} border-current flex items-center gap-1`}
                          >
                            {paymentMethod.icon}
                            {paymentMethod.text}
                          </Badge>
                          {invoice.customer_name && (
                            <Badge
                              variant="outline"
                              className={
                                invoice.customer_name === "عميل فوري"
                                  ? "text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500"
                                  : "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500"
                              }
                            >
                              {invoice.customer_name}
                            </Badge>
                          )}
                          {invoice.phone && (
                            <Badge
                              variant="outline"
                              className={
                                invoice.phone !== "سيتم تحديده لاحقًا"
                                  ? "text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500"
                                  : "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500"
                              }
                            >
                              {invoice.phone}
                            </Badge>
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {invoice.items.length} منتج
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            {formatDate(invoice.date)} -{" "}
                            {invoice.time || "--:--"}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            {invoice.cashier_name}
                            {invoice.is_cashier_deleted && (
                              <Badge variant="destructive" className="text-xs ml-1">محذوف</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {Number(invoice.total_amount).toFixed(2)} ج.م
                        </div>
                        {invoice.paid_amount > 0 && (
                          <div
                            className={`text-sm ${
                              invoice.status === "paid"
                                ? "text-green-600 dark:text-green-400"
                                : "text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            مدفوع: {Number(invoice.paid_amount).toFixed(2)} ج.م
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPrintClick(invoice);
                              setPrintDialogOpen(true);
                            }}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            طباعة
                          </Button>
                          <Can action="delete" subject="SalesInvoice">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceToDelete(invoice);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              🗑 حذف
                            </Button>
                          </Can>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6" dir="rtl">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
                  disabled={currentPage === 0}
                  className={`transition-all duration-200 flex items-center gap-1 ${
                    currentPage > 0
                      ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700"
                      : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  الصفحة {currentPage + 1} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages - 1))}
                  disabled={currentPage >= totalPages - 1}
                  className={`transition-all duration-200 flex items-center gap-1 ${
                    currentPage < totalPages - 1
                      ? "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700"
                      : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
          <DialogTitle className="dark:text-gray-200 flex items-center gap-2">
            🗑 تأكيد الحذف
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-2">
            هل أنت متأكد أنك تريد حذف الفاتورة <strong>{invoiceToDelete?.invoice_number}</strong>؟
          </p>
          <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-slate-700 rounded-lg my-4">
            <span className="text-sm font-medium dark:text-gray-300">المجموع:</span>
            <span className="font-bold text-red-600 dark:text-red-400">
              {invoiceToDelete?.total_amount.toFixed(2)} ج.م
            </span>
          </div>
          <div className="flex gap-2 sm:justify-start">
            <Button
              onClick={() => {
                if (invoiceToDelete) onDeleteClick(invoiceToDelete);
                setDeleteDialogOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 dark:text-gray-200"
            >
              نعم، حذف
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoicesList;