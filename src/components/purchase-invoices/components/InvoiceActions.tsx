// InvoiceActions.tsx
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
// import { useAbility } from "@/hooks/useAbility";
import { Can } from "@/components/Can";

interface InvoiceActionsProps {
  isLoading: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const InvoiceActions = ({
  isLoading,
  onView,
  onEdit,
  onDelete,
}: InvoiceActionsProps) => {
  // const ability = useAbility();
  
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 h-8 border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-slate-700 text-sm rounded-lg"
        onClick={onView}
        disabled={isLoading}
      >
        <Eye className="w-4 h-4" />
        عرض
      </Button>
      <Can action="update" subject="PurchaseInvoice">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-8 border-green-500 text-green-500 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-slate-700 text-sm rounded-lg"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Edit className="w-4 h-4" />
          تعديل
        </Button>
      </Can>
      <Can action="delete" subject="PurchaseInvoice">
        <Button
          variant="destructive"
          size="sm"
          className="flex items-center gap-2 h-8 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white text-sm rounded-lg"
          onClick={onDelete}
          disabled={isLoading}
        >
          <Trash2 className="w-4 h-4" />
          حذف
        </Button>
      </Can>
    </div>
  );
};