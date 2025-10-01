import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingPrintAction: () => void;
}

const PrintDialog = ({ open, onOpenChange, pendingPrintAction }: PrintDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:text-gray-100" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تأكيد الطباعة</DialogTitle>
          <DialogDescription className="text-right dark:text-gray-400">
            هل تريد طباعة الفاتورة الآن؟
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start gap-2">
          <Button
            type="button"
            onClick={() => {
              pendingPrintAction();
              onOpenChange(false);
            }}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
          >
            نعم، طباعة
          </Button>
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="secondary"
              className="dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
            >
              إلغاء
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintDialog;