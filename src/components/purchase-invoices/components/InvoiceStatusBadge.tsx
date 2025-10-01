import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

interface InvoiceStatusBadgeProps {
  status: string;
}

export const InvoiceStatusBadge = ({ status }: InvoiceStatusBadgeProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "fully_paid":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
      case "partially_paid":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700";
      case "unpaid":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "fully_paid":
        return <CheckCircle className="w-4 h-4" />;
      case "partially_paid":
        return <AlertCircle className="w-4 h-4" />;
      case "unpaid":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    } 
  };

  const getStatusText = () => {
    switch (status) {
      case "fully_paid":
        return "مدفوع بالكامل";
      case "partially_paid":
        return "غير مكتمل الدفع";
      case "unpaid":
        return "غير مدفوع";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 px-3 py-1 rounded-full border text-sm",
        getStatusColor()
      )}
    >
      {getStatusIcon()}
      {getStatusText()}
    </div>
  );
};