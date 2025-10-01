import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesInvoice } from "./SalesInvoices";

// تعريف الـ props لمكون تأكيد الطباعة
interface PrintConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SalesInvoice | null;
  onConfirm: () => void;
  isLoading: boolean;
}

// مكون لعرض نافذة تأكيد طباعة الفاتورة
const PrintConfirmationDialog = ({ isOpen, onOpenChange, invoice, onConfirm, isLoading }: PrintConfirmationDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[95vw] sm:max-w-md rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-200 text-right">
            تأكيد الطباعة
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-right mt-1">
            هل تريد طباعة الفاتورة {invoice?.invoice_number} الآن؟
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50 dark:bg-slate-700 rounded-lg mt-4 mb-6">
          <span className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300">
            المجموع:
          </span>
          <span className="font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
            {Number(invoice?.total_amount || 0).toFixed(2)} ج.م
          </span>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-start">
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto h-12 px-4 text-sm sm:text-base bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200 rounded-lg font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "جاري المعالجة..." : "نعم، طباعة"}
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

export default PrintConfirmationDialog;