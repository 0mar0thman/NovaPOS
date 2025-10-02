import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Printer } from "lucide-react";
import { SalesInvoice, Cashier, PaymentStatus } from "./SalesInvoices";

// تعريف الـ props لمكون كرت الفاتورة
interface InvoiceCardProps {
  invoice: SalesInvoice;
  getPaymentStatusColor: (status: PaymentStatus) => string;
  getPaymentStatusText: (status: PaymentStatus) => string;
  formatDate: (dateString: string) => string;
  currentUser: Cashier | null;
  onClick: () => void;
  onPrint: () => void;
}

// مكون لعرض كرت الفاتورة
const InvoiceCard = ({ invoice, getPaymentStatusColor, getPaymentStatusText, formatDate, currentUser, onClick, onPrint }: InvoiceCardProps) => {
  return (
    <Card
      className={`border-blue-200 dark:border-slate-600 hover:shadow-md dark:hover:shadow-slate-700 transition-all duration-200 cursor-pointer ${
        invoice.status === 'paid' ? 'border-green-200 dark:border-green-800' :
        invoice.status === 'partial' ? 'border-yellow-200 dark:border-yellow-800' : 
        'border-red-200 dark:border-red-800'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500">
                {invoice.invoice_number}
              </Badge>
              <Badge className={`text-xs ${getPaymentStatusColor(invoice.status)} hover:bg-transparent dark:hover:bg-transparent`}>
                {getPaymentStatusText(invoice.status)}
              </Badge>
              {invoice.customer_name && (
                <Badge variant="outline" className={
                  invoice.customer_name === 'عميل فوري' 
                    ? 'text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500' 
                    : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500'
                }>
                  {invoice.customer_name}
                </Badge>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {invoice.items.length} منتج
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {invoice.date} - {invoice.time || '--:--'}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {currentUser?.name || 'غير معروف'}
              </div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {invoice.total_amount.toFixed(2)} ج.م
            </div>
            {invoice.paid_amount > 0 && (
              <div className={`text-sm ${
                invoice.status === 'paid' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                مدفوع: {invoice.paid_amount.toFixed(2)} ج.م
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                onPrint();
              }}
            >
              <Printer className="w-4 h-4 mr-1" />
              طباعة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;