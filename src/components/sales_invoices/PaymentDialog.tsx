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

// مكون لإدارة دفعات الفاتورة
const PaymentDialog = ({ isOpen, onOpenChange, invoice, paymentAmount, setPaymentAmount, onAddPayment, isLoading }: PaymentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-200">تسديد دفعة</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            الرجاء إدخال معلومات الدفع للفاتورة {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المتبقي:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {(invoice?.total_amount || 0) - (invoice?.paid_amount || 0)} ج.م
            </span>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المدفوع</label>
            <Input
              type="number"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              placeholder="أدخل المبلغ المدفوع"
              min={0}
              max={(invoice?.total_amount || 0) - (invoice?.paid_amount || 0)}
              className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            onClick={onAddPayment}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200"
            disabled={isLoading || paymentAmount <= 0}
          >
            {isLoading ? "جاري المعالجة..." : "تسديد الدفعة"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;