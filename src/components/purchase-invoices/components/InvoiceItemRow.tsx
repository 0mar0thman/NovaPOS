import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { InvoiceActions } from "./InvoiceActions";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { PurchaseInvoice } from "../types/types";
import { safeToFixed, getPaymentStatus, isUpdated } from "../types/utils";

interface InvoiceItemRowProps {
  invoice: PurchaseInvoice;
  index: number;
  totalItems: number;
  isLoading: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const InvoiceItemRow = ({
  invoice,
  index,
  totalItems,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: InvoiceItemRowProps) => {
  const status = getPaymentStatus(invoice);
  const updated = isUpdated(invoice);
  const reverseIndex = totalItems - index;
  const supplierName = invoice.supplier?.name || "غير محدد";
  const supplierPhone = invoice.supplier?.phone || "غير محدد";

  return (
    <TableRow
      key={invoice.id}
      className={cn(
        "hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer",
        updated &&
          "bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-900/30 dark:hover:bg-blue-900/40"
      )}
      onClick={onView}
    >
      <TableCell className="text-sm dark:text-gray-200 py-3 text-right">
        {reverseIndex}
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        <div className="flex items-center gap-2">
          {invoice.invoice_number}
          {updated && (
            <RefreshCw className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {supplierName}
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {supplierPhone}
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {new Date(invoice.date).toLocaleDateString("en-EG")}
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3 text-right">
        {invoice.items?.length || 0}
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {safeToFixed(invoice.total_amount)} ج.م
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {safeToFixed(invoice.amount_paid)} ج.م
      </TableCell>
      <TableCell className="text-sm dark:text-gray-200 py-3">
        {safeToFixed((invoice.total_amount ?? 0) - (invoice.amount_paid ?? 0))}{" "}
        ج.م
      </TableCell>
      <TableCell>
        <InvoiceStatusBadge status={status} />
      </TableCell>
      <TableCell className="flex justify-center gap-2 py-3">
        <InvoiceActions
          isLoading={isLoading}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
};
