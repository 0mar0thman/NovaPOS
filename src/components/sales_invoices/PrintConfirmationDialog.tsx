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
      <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-200">تأكيد الطباعة</DialogTitle>
          <DialogDescription className="dark:text-gray-400">
            هل تريد طباعة الفاتورة {invoice?.invoice_number} الآن؟
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-slate-700 rounded-lg mb-4">
          <span className="text-sm font-medium dark:text-gray-300">المجموع:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {Number(invoice?.total_amount).toFixed(2)} ج.م
          </span>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            onClick={onConfirm}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200"
            disabled={isLoading}
          >
            نعم، طباعة
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

export default PrintConfirmationDialog;