import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Wallet, Printer } from "lucide-react";
import { Dispatch, SetStateAction } from 'react';
import { SalesInvoice, Cashier, PaymentStatus } from "./SalesInvoices";

export interface InvoiceDetailDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  invoice: SalesInvoice | null;
  formatDate: (dateString: string) => string;
  getPaymentStatusColor: (status: PaymentStatus) => 'bg-green-100 text-green-800' | 'bg-yellow-100 text-yellow-800' | 'bg-red-100 text-red-800';
  getPaymentStatusText: (status: PaymentStatus) => string;
  currentUser: Cashier | null;
  onPrint: () => void;
  onAddPayment: () => void;
  isLoading: boolean;
  setPrintDialogOpen: Dispatch<SetStateAction<boolean>>;
  getPaymentMethodDetails: (method: string) => { icon: JSX.Element; text: string; color: string };
}

const InvoiceDetailDialog = ({
  isOpen,
  onOpenChange,
  invoice,
  formatDate,
  getPaymentStatusColor,
  getPaymentStatusText,
  currentUser,
  onPrint,
  onAddPayment,
  isLoading,
  setPrintDialogOpen,
  getPaymentMethodDetails,
}: InvoiceDetailDialogProps) => {
  const paymentDetails = invoice ? getPaymentMethodDetails(invoice.payment_method) : null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-gray-200">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            تفاصيل الفاتورة {invoice?.invoice_number}
          </DialogTitle>
        </DialogHeader>
        <div dir="rtl">
          {invoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">رقم الفاتورة</span>
                  <p className="font-semibold dark:text-gray-200">{invoice.invoice_number}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">التاريخ</span>
                  <p className="font-semibold dark:text-gray-200">{new Date(invoice.created_at).toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">الوقت</span>
                  <p className="font-semibold dark:text-gray-200">{invoice.time || '--:--'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">البائع</span>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold dark:text-gray-200">{invoice.cashier_name}</p>
                    {invoice.is_cashier_deleted && (
                      <Badge variant="destructive" className="text-xs">محذوف</Badge>
                    )}
                  </div>
                </div>
                {invoice.customer_name && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">العميل</span>
                    <p className="font-semibold dark:text-gray-200">{invoice.customer_name}</p>
                  </div>
                )}
                {invoice.phone && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">الهاتف</span>
                    <p className="font-semibold dark:text-gray-200">{invoice.phone}</p>
                  </div>
                )}
                {paymentDetails && (
                  <div className={paymentDetails.color + " flex items-center gap-2 dark:text-gray-200"}>
                    <span className="text-sm text-gray-600 dark:text-gray-200">طريقة الدفع</span>
                    <span>{paymentDetails.icon}</span>
                    <p>{paymentDetails.text}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-200 ml-2">حالة الدفع</span>
                  <Badge className={`mt-1 ${getPaymentStatusColor(invoice.status)} dark:bg-opacity-20 dark:text-opacity-100 dark:text-gray-200`}>
                    {getPaymentStatusText(invoice.status)}
                  </Badge>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">تفاصيل المنتجات</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700 hover:dark:bg-slate-700">
                      <TableHead className="text-right dark:text-gray-300">#</TableHead>
                      <TableHead className="text-right dark:text-gray-300">المنتج</TableHead>
                      <TableHead className="text-right dark:text-gray-300">السعر</TableHead>
                      <TableHead className="text-right dark:text-gray-300">الكمية</TableHead>
                      <TableHead className="text-right dark:text-gray-300">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item, index) => (
                      <TableRow key={item.id || item.product_id} className="dark:border-slate-700 hover:dark:bg-slate-700/50">
                        <TableCell className="dark:text-gray-300">{index + 1}</TableCell>
                        <TableCell className="font-medium dark:text-gray-200">{item.name}</TableCell>
                        <TableCell className="dark:text-gray-300">{Number(item.unit_price).toFixed(2)} ج.م</TableCell>
                        <TableCell className="dark:text-gray-300">{item.quantity}</TableCell>
                        <TableCell className="font-semibold dark:text-gray-200">{Number(item.total_price).toFixed(2)} ج.م</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 dark:bg-slate-700 dark:border-slate-700">
                      <TableCell colSpan={4} className="text-right font-bold dark:text-gray-200">المجموع</TableCell>
                      <TableCell className="font-bold text-blue-600 dark:text-blue-400">{Number(invoice.total_amount).toFixed(2)} ج.م</TableCell>
                    </TableRow>
                    {invoice.paid_amount > 0 && (
                      <>
                        <TableRow className="bg-gray-50 dark:bg-slate-700 dark:border-slate-700">
                          <TableCell colSpan={4} className="text-right font-bold dark:text-gray-200">المبلغ المدفوع</TableCell>
                          <TableCell className={`font-bold ${invoice.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                            {Number(invoice.paid_amount).toFixed(2)} ج.م
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-gray-50 dark:bg-slate-700 dark:border-slate-700">
                          <TableCell colSpan={4} className="text-right font-bold dark:text-gray-200">الباقي</TableCell>
                          <TableCell className="font-bold text-red-600 dark:text-red-400">
                            {Number(invoice.total_amount - invoice.paid_amount).toFixed(2)} ج.م
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
              {invoice.notes && (
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <h4 className="font-semibold mb-2 dark:text-gray-200">ملاحظات:</h4>
                  <p className="dark:text-gray-300">{invoice.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                {invoice.status !== 'paid' && (
                  <Button
                    variant="outline"
                    className="flex-1 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                    onClick={onAddPayment}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    تسديد دفعة
                  </Button>
                )}
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 dark:text-gray-200"
                  onClick={() => {
                    onPrint();
                    setPrintDialogOpen(true);
                  }}
                  disabled={isLoading}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {isLoading ? "جاري التحميل..." : "طباعة الفاتورة"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailDialog;