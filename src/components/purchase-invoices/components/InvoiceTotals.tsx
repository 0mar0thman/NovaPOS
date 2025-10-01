import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InvoiceTotalsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export const InvoiceTotals = ({
  currentPage,
  totalPages,
  onPageChange,
}: InvoiceTotalsProps) => (
  <div className="flex justify-center items-center gap-4 mt-6">
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
      disabled={currentPage === 0}
      className={cn(
        "h-8 text-sm border-gray-300 dark:border-slate-600 rounded-lg shadow-sm",
        currentPage > 0
          ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          : "text-gray-400 cursor-not-allowed dark:text-gray-500"
      )}
    >
      السابق
    </Button>
    <span className="text-sm text-gray-600 dark:text-gray-400">
      الصفحة {currentPage + 1} من {totalPages}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
      disabled={currentPage >= totalPages - 1}
      className={cn(
        "h-8 text-sm border-gray-300 dark:border-slate-600 rounded-lg shadow-sm",
        currentPage < totalPages - 1
          ? "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-700"
          : "text-gray-400 cursor-not-allowed dark:text-gray-500"
      )}
    >
      التالي
    </Button>
  </div>
);