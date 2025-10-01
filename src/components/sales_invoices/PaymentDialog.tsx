import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SalesInvoice } from "./SalesInvoices";

// تعريف الـ props لمكون نافذة الدفع
interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoice | null;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  onAddPayment: () => void;
  isLoading: boolean;
}

const PaymentDialog = ({ isOpen, onOpenChange, invoice, paymentAmount, setPaymentAmount, onAddPayment, isLoading }: PaymentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-200 text-right">
            تسديد دفعة
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-right mt-1">
            الرجاء إدخال معلومات الدفع للفاتورة {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-4">
          <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
            <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
              المبلغ المتبقي:
            </span>
            <span className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
              {((invoice?.total_amount || 0) - (invoice?.paid_amount || 0)).toFixed(2)} ج.م
            </span>
          </div>
          <div className="space-y-2">
            <label className="block text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 text-right">
              المبلغ المدفوع
            </label>
            <Input
              type="number"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              placeholder="أدخل المبلغ المدفوع"
              min={0}
              max={(invoice?.total_amount || 0) - (invoice?.paid_amount || 0)}
              className="w-full h-12 text-right text-sm sm:text-base bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:placeholder-gray-500 rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6 sm:gap-2 sm:justify-start">
          <Button
            onClick={onAddPayment}
            className="w-full sm:w-auto h-12 px-4 text-sm sm:text-base bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200 rounded-lg font-medium transition-colors"
            disabled={isLoading || paymentAmount <= 0}
          >
            {isLoading ? "جاري المعالجة..." : "تسديد الدفعة"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-12 px-4 text-sm sm:text-base border-gray-300 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;