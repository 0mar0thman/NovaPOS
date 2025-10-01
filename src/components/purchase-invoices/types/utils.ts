import { PurchaseInvoice, PurchaseInvoiceItem } from "./types";

export const formatDate = (dateString: string): string => {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return date.toLocaleDateString('en-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const safeToFixed = (value: number | null | undefined): string => {
  const num = value ?? 0;
  return isNaN(num) ? "0.00" : Number(num).toFixed(2);
};

export const getPaymentStatus = (invoice: PurchaseInvoice) => {
  const total = invoice.total_amount ?? 0;
  const paid = invoice.amount_paid ?? 0;
  const remaining = total - paid;

  if (remaining <= 0) return "fully_paid";
  if (paid > 0) return "partially_paid";
  return "unpaid";
};

export const isUpdated = (invoice: PurchaseInvoice) => {
  if (!invoice.created_at || !invoice.updated_at) return false;
  return new Date(invoice.updated_at) > new Date(invoice.created_at);
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const calculateItemTotal = (item: PurchaseInvoiceItem) => {
  return (item.quantity || 1) * (item.unit_price || 0) * (item.number_of_units || 1);
};

export const validatePhone = (phone: string) => {
  return /^01\d{9}$/.test(phone);
};

