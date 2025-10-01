import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useState, useMemo, useCallback } from "react";

interface SaleInvoice {
  id: string;
  invoice_number: string;
  date: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: SaleItem[];
  cashier?: {
    name: string;
  };
  customer_name?: string;
  phone?: string;
  paid_amount?: number;
}

interface SaleItem {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  returned_quantity: number;
  product?: {
    name: string;
    barcode: string;
    category?: {
      name: string;
      color: string;
    };
  };
}

interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedInvoice: SaleInvoice | null;
  returnItems: { [key: string]: number };
  setReturnItems: (items: { [key: string]: number }) => void;
  handleReturnItems: () => Promise<void>;
  isLoading: boolean;
  getPaymentMethodName: (method: string) => string;
  currentUser?: {
    name: string;
  };
}

interface InvoiceItem {
  id: string;
  product_id: string;
  product_name?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  returned_quantity?: number;
  product?: {
    name: string;
    barcode: string;
    category?: {
      name: string;
      color: string;
    };
  };
}

interface ReturnResponse {
  success: boolean;
  message: string;
  data?: {
    return_id: string;
    new_invoice_total: number;
    returned_items: Array<{
      item_id: string;
      returned_quantity: number;
      refund_amount: number;
    }>;
  };
  error?: string;
}

const ReturnDialog = ({
  open,
  onOpenChange,
  selectedInvoice,
  returnItems,
  setReturnItems,
  handleReturnItems,
  isLoading,
  getPaymentMethodName,
  currentUser
}: ReturnDialogProps) => {
  const [showPrintOption, setShowPrintOption] = useState(false);
  const [returnResponse, setReturnResponse] = useState<ReturnResponse | null>(null);

  // استخدام useMemo لحساب الإجمالي بعد الاسترجاع
  const totalAfterReturn = useMemo(() => {
    if (!selectedInvoice) return 0;
    
    let total = selectedInvoice.total_amount;
    
    selectedInvoice.items.forEach(item => {
      const returnQty = returnItems[item.id] || 0;
      total -= returnQty * item.unit_price;
    });
    
    return Math.max(0, total); // التأكد من أن الإجمالي لا يكون سالباً
  }, [selectedInvoice, returnItems]);

  // استخدام useCallback لمنع إعادة إنشاء الدالة
  const onConfirmReturn = useCallback(async (shouldPrint: boolean) => {
    try {
      console.log("بيانات الاسترجاع المُرسلة:", {
        invoice_id: selectedInvoice?.id,
        returnItems,
        print: shouldPrint
      });

      // إعادة تعيين response السابقة
      setReturnResponse(null);

      // تنفيذ عملية الاسترجاع
      await handleReturnItems();

      // محاكاة response ناجحة (يجب استبدالها بالـ response الفعلية من API)
      const mockResponse: ReturnResponse = {
        success: true,
        message: "تم استرجاع المنتجات بنجاح",
        data: {
          return_id: `RET-${Date.now()}`,
          new_invoice_total: totalAfterReturn,
          returned_items: Object.entries(returnItems)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, qty]) => {
              const item = selectedInvoice?.items.find(i => i.id === itemId);
              return {
                item_id: itemId,
                returned_quantity: qty,
                refund_amount: qty * (item?.unit_price || 0)
              };
            })
        }
      };

      setReturnResponse(mockResponse);

      // إذا طلب المستخدم الطباعة وكانت العملية ناجحة
      if (shouldPrint && selectedInvoice && mockResponse.success) {
        setTimeout(() => {
          generateInvoicePDF({
            ...selectedInvoice,
            hasReturns: Object.values(returnItems).some(qty => qty > 0),
            total_amount: mockResponse.data?.new_invoice_total || totalAfterReturn
          });
        }, 500);
      }

    } catch (error) {
      console.error("خطأ في عملية الاسترجاع:", error);
      
      const errorResponse: ReturnResponse = {
        success: false,
        message: "فشل في عملية الاسترجاع",
        error: error instanceof Error ? error.message : "خطأ غير معروف"
      };
      
      setReturnResponse(errorResponse);
    }
  }, [selectedInvoice, returnItems, handleReturnItems, totalAfterReturn]);

  const getPaymentMethodDetails = useCallback((method: string) => {
    switch (method) {
      case "cash":
        return { text: "نقدي", color: "text-green-600" };
      case "card":
        return { text: "بطاقة ائتمان", color: "text-blue-600" };
      case "bank_transfer":
        return { text: "تحويل بنكي", color: "text-purple-600" };
      default:
        return { text: method, color: "text-gray-600" };
    }
  }, []);

  const generateInvoicePDF = async (invoiceData: any) => {
    try {
      // التحقق من صحة بيانات الفاتورة
      if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
        console.error("خطأ: بيانات الفاتورة غير صالحة أو غير مكتملة", invoiceData);
        alert("خطأ: بيانات الفاتورة غير صالحة. يرجى التأكد من اختيار فاتورة صحيحة والمحاولة مرة أخرى.");
        return;
      }

      const safeData = JSON.parse(JSON.stringify(invoiceData));
      const paidAmount = safeData.paid_amount || safeData.total_amount || 0;
      
      // تصفية العناصر لاستبعاد المنتجات التي تم استرجاعها بالكامل أو جزئيًا
      const filteredItems = safeData.items.filter((item: any) => {
        const returnQty = returnItems[item.id] || item.returned_quantity || 0;
        const quantity = item.quantity - returnQty;
        return quantity > 0;
      }).map((item: any) => ({
        ...item,
        quantity: item.quantity - (returnItems[item.id] || item.returned_quantity || 0)
      }));

      // حساب الإجمالي بعد استبعاد المرتجعات
      const itemsTotal = filteredItems.reduce(
        (sum: number, item: any) => {
          return sum + Number(item.unit_price) * item.quantity;
        },
        0
      );
      
      const formattedDate = safeData.date
        ? new Date(safeData.date).toLocaleDateString("en-CA")
        : new Date().toLocaleDateString("en-CA");
      const formattedTime = safeData.created_at
        ? new Date(safeData.created_at).toLocaleTimeString("en-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
      const paymentMethodDetails = getPaymentMethodDetails(safeData.payment_method || "cash");

      // محاولة فتح نافذة الطباعة
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        console.error("فشل فتح نافذة الطباعة: من المحتمل أن تكون النوافذ المنبثقة محظورة");
        alert("فشل فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع في إعدادات المتصفح والمحاولة مرة أخرى.");
        return;
      }

      const printContent = `
        <html dir="rtl">
        <head>
          <title>فاتورة ${safeData.invoice_number || "غير معروف"}</title>
          <meta charset="UTF-8">
          <script src="/libs/JsBarcode.all.min.js"></script>
          <style>
            * { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box;   
            }
            body { 
              width: 80mm; 
              margin: 0 auto; 
              padding: 2mm; 
              color: #000; 
              font-size: 12px; 
              line-height: 1.3; 
              background: #fff;
            }

            .header { 
              text-align: center; 
              margin-bottom: 5px; 
              padding-bottom: 5px; 
              border-bottom: 1px dashed #000; 
            }
            .store-name { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
            .invoice-title { font-size: 14px; margin: 3px 0; }
            .invoice-number { font-size: 13px; font-weight: bold; background: #f0f0f0; padding: 2px 5px; display: inline-block; border-radius: 3px; }

            .info { margin: 8px 0; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
            .info-label { font-weight: bold; min-width: 60px; }

            table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
            th, td { padding: 4px 2px; text-align: right; border-bottom: 1px solid #ddd; }
            th { font-weight: bold; border-bottom: 2px solid #000; }
            .total-row { font-weight: bold; border-top: 2px solid #000; }

            .status-badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .paid { background: #e6f7e6; color: #0a5c0a; }

            .method-badge { display: inline-block; padding: 2px 5px; border-radius: 3px; background: #f0f0f0; font-size: 10px; }

            .totals-box { border: 1px solid #000; padding: 8px; margin-top: 8px; font-size: 12px; }
            .total-item { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .total-value { font-weight: bold; }

            .footer { margin-top: 10px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #aaa; padding-top: 5px; }

            .barcode-container { 
              text-align: center; 
              margin: 8px 0; 
            }
            .barcode-container img,
            .barcode-container canvas {
              max-width: 250px;
              height: auto;
            }
            .barcode-label { font-size: 10px; margin-top: 2px; }

            .return-info {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              padding: 5px;
              margin: 5px 0;
              font-size: 10px;
            }

            @media print {
              @page {
                size: auto;  
                margin: 0mm auto;
              }
              body { 
                width: 80mm; 
                margin: 0 auto; 
                padding: 2mm; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">حلواني الحسن والحسين</div>
            <div class="invoice-title">فاتورة مبيعات ${safeData.hasReturns ? '(بعد الاسترجاع)' : ''}</div>
          </div>
        
          ${safeData.hasReturns ? `
            <div class="return-info">
              <strong>ملاحظة:</strong> هذه الفاتورة تحتوي على مرتجعات
            </div>
          ` : ''}

          <div class="info">
            <div class="info-row"><span class="info-label">التاريخ:</span><span>${formattedDate} ${formattedTime}</span></div>
            <div class="info-row"><span class="info-label">البائع:</span><span>${safeData.cashier?.name || currentUser?.name || "غير معروف"}</span></div>
            ${
              safeData.customer_name
                ? `<div class="info-row"><span class="info-label">العميل:</span><span>${safeData.customer_name}</span></div>`
                : ""
            }
            ${
              safeData.phone
                ? `<div class="info-row"><span class="info-label">رقم الهاتف:</span><span>${safeData.phone}</span></div>`
                : ""
            }
            <div class="info-row"><span class="info-label">حالة الدفع:</span><span class="status-badge paid">مدفوعة</span></div>
            <div class="info-row"><span class="info-label">طريقة الدفع:</span><span class="method-badge">${paymentMethodDetails.text}</span></div>
          </div>
          <table>
            <thead><tr><th style="width: 5%">#</th><th style="width: 40%">المنتج</th><th style="width: 20%">السعر</th><th style="width: 15%">الكمية</th><th style="width: 20%">الإجمالي</th></tr></thead>
            <tbody>
              ${filteredItems
                .map(
                  (item: any, index: number) => {
                    const totalPrice = Number(item.unit_price) * item.quantity;
                    return `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${item.name || item.product_name || "منتج غير معروف"}</td>
                      <td>${Number(item.unit_price).toFixed(2)}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td>${totalPrice.toFixed(2)}</td>
                    </tr>
                  `;
                  }
                )
                .join("")}
              <tr class="total-row"><td colspan="2">المجموع</td><td colspan="3" style="text-align: left;">${itemsTotal.toFixed(2)} ج.م</td></tr>
            </tbody>
          </table>
          <div class="totals-box">
            <div class="total-item"><span>المجموع:</span><span class="total-value">${itemsTotal.toFixed(2)} ج.م</span></div>
            <div class="total-item"><span>المدفوع:</span><span class="total-value">${Number(paidAmount).toFixed(2)} ج.م</span></div>
          </div>
          
          <div class="barcode-container">
             <canvas id="barcode"></canvas>
             <div class="barcode-label">${safeData.invoice_number || "غير معروف"}</div>
          </div>
          <div class="footer">
            <div>شكراً لزيارتكم - نتمنى لكم يومًا سعيدًا</div>
            <div>هاتف: 01024456408 | ${new Date().getFullYear()} ©</div>
          </div>
          <script>
            try {
              JsBarcode("#barcode", "${safeData.invoice_number || 'غير معروف'}", {
                format: "CODE128",
                width: 2,
                height: 30,
                displayValue: false,
                margin: 5
              });
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 500);
            } catch (e) {
              console.error("خطأ أثناء إنشاء الباركود أو الطباعة:", e);
              window.close();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 1000);
    } catch (error) {
      console.error("خطأ في إنشاء نافذة الطباعة:", error);
      alert("حدث خطأ أثناء محاولة الطباعة: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    }
  };

  // إعادة تعيين الحالة عند إغلاق الدايالوج
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      setShowPrintOption(false);
      setReturnResponse(null);
    }
    onOpenChange(isOpen);
  };

  // حساب إجمالي الكمية المسترجعة
  const totalReturnedQuantity = useMemo(() => {
    return Object.values(returnItems).reduce((sum, qty) => sum + qty, 0);
  }, [returnItems]);

  // حساب إجمالي المبلغ المسترجع
  const totalRefundAmount = useMemo(() => {
    if (!selectedInvoice) return 0;
    
    return selectedInvoice.items.reduce((sum, item) => {
      const returnQty = returnItems[item.id] || 0;
      return sum + (returnQty * item.unit_price);
    }, 0);
  }, [selectedInvoice, returnItems]);

  // دالة لعرض بطاقة المنتج (للشاشات الصغيرة)
  const renderItemCard = (item: SaleItem) => {
    const maxReturnable = item.quantity - (item.returned_quantity || 0);
    const totalPrice = item.quantity * item.unit_price;
    const returnValue = returnItems[item.id] || 0;

    if (maxReturnable <= 0) return null;

    return (
      <div
        key={item.id}
        className="
          rounded-lg 
          border 
          bg-card 
          p-3 sm:p-4
          shadow-sm 
          transition-all 
          hover:shadow-md
          dark:bg-gray-800
          dark:border-gray-700
        "
      >
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <h4 className="font-medium text-sm sm:text-base dark:text-gray-200">
                {item.product?.name || item.product_name || 'منتج غير معروف'}
              </h4>
              {item.product?.barcode && (
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  باركود: {item.product.barcode}
                </span>
              )}
            </div>
            {item.product?.category && (
              <Badge
                className="text-[10px] sm:text-xs text-white w-fit"
                style={{ backgroundColor: item.product.category.color }}
              >
                {item.product.category.name}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر الوحدة:</span>
              <span className="dark:text-gray-300">{Number(item.unit_price).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الكمية المباعة:</span>
              <span className="dark:text-gray-300">{item.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">السعر الإجمالي:</span>
              <span className="dark:text-gray-300">{Number(totalPrice).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المسترجعة سابقاً:</span>
              <span className="dark:text-gray-300">{item.returned_quantity || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المتبقي للاسترجاع:</span>
              <span className="dark:text-gray-300">{maxReturnable}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">الكمية للاسترجاع:</span>
              <Input
                type="number"
                min={0}
                max={maxReturnable}
                value={returnValue}
                onChange={(e) => {
                  const value = Math.min(
                    Math.max(0, parseInt(e.target.value) || 0),
                    maxReturnable
                  );
                  setReturnItems({ ...returnItems, [item.id]: value });
                  setShowPrintOption(Object.values({ ...returnItems, [item.id]: value }).some(q => q > 0));
                }}
                className="w-14 sm:w-16 text-center text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white h-8 sm:h-9"
                dir="rtl"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // دالة لعرض الجدول (للشاشات الكبيرة)
  const renderItemTable = () => {
    return (
      <div className="overflow-x-auto">
        <Table dir="rtl" className="min-w-[600px] text-xs sm:text-sm">
          <TableHeader>
            <TableRow className="dark:border-gray-700">
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">المنتج</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">الفئة</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">سعر الوحدة</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">الكمية المباعة</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">السعر الإجمالي</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">المسترجعة سابقاً</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">المتبقي للاسترجاع</TableHead>
              <TableHead className="text-right text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">الكمية للاسترجاع</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedInvoice?.items.map((item) => {
              const maxReturnable = item.quantity - (item.returned_quantity || 0);
              const totalPrice = item.quantity * item.unit_price;
              const returnValue = returnItems[item.id] || 0;
              
              return maxReturnable > 0 ? (
                <TableRow key={item.id} className="dark:border-gray-700 hover:dark:bg-gray-800">
                  <TableCell className="font-medium text-xs sm:text-sm dark:text-gray-200 px-1 sm:px-2">
                    {item.product?.name || item.product_name || 'منتج غير معروف'}
                    {item.product?.barcode && (
                      <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">باركود: {item.product.barcode}</div>
                    )}
                  </TableCell>
                  <TableCell className="px-1 sm:px-2">
                    {item.product?.category ? (
                      <Badge
                        className="text-[10px] sm:text-xs text-white"
                        style={{ backgroundColor: item.product.category.color }}
                      >
                        {item.product.category.name}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">{Number(item.unit_price).toFixed(2)} ج.م</TableCell>
                  <TableCell className="text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">{item.quantity}</TableCell>
                  <TableCell className="text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">{Number(totalPrice).toFixed(2)} ج.م</TableCell>
                  <TableCell className="text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">{item.returned_quantity || 0}</TableCell>
                  <TableCell className="text-xs sm:text-sm dark:text-gray-300 px-1 sm:px-2">{maxReturnable}</TableCell>
                  <TableCell className="px-1 sm:px-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxReturnable}
                      value={returnValue}
                      onChange={(e) => {
                        const value = Math.min(
                          Math.max(0, parseInt(e.target.value) || 0),
                          maxReturnable
                        );
                        setReturnItems({ ...returnItems, [item.id]: value });
                        setShowPrintOption(Object.values({ ...returnItems, [item.id]: value }).some(q => q > 0));
                      }}
                      className="w-14 sm:w-16 text-center text-xs sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white h-8 sm:h-9"
                      dir="rtl"
                      disabled={isLoading}
                    />
                  </TableCell>
                </TableRow>
              ) : null;
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-4xl lg:max-w-6xl max-h-[85vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-100 p-3 sm:p-4 md:p-6" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-left text-base sm:text-lg md:text-xl dark:text-gray-200">استرجاع منتجات</DialogTitle>
          <DialogDescription className="text-right text-xs sm:text-sm md:text-base dark:text-gray-300 space-y-1 sm:space-y-2">
            {selectedInvoice && (
              <div>
                <p>فاتورة رقم: {selectedInvoice.invoice_number}</p>
                <p>التاريخ والوقت: {format(new Date(selectedInvoice.created_at), 'yyyy/MM/dd HH:mm', { locale: ar })}</p>
                <p>طريقة الدفع: {getPaymentMethodName(selectedInvoice.payment_method)}</p>
                <p>المبلغ الإجمالي: {Number(selectedInvoice.total_amount).toFixed(2)} ج.م</p>
                {totalReturnedQuantity > 0 && (
                  <>
                    <p className="font-bold text-red-600">
                      الكمية المسترجعة: {totalReturnedQuantity} عنصر
                    </p>
                    <p className="font-bold text-red-600">
                      المبلغ المسترجع: {totalRefundAmount.toFixed(2)} ج.م
                    </p>
                    <p className="font-bold text-green-600">
                      الإجمالي بعد الاسترجاع: {totalAfterReturn.toFixed(2)} ج.م
                    </p>
                  </>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* عرض رسالة الاستجابة */}
        {returnResponse && (
          <div className={`p-2 sm:p-3 md:p-4 rounded-md ${
            returnResponse.success 
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="font-semibold text-xs sm:text-sm md:text-base">{returnResponse.message}</span>
              {returnResponse.success && returnResponse.data && (
                <Badge variant="secondary" className="text-xs">
                  رقم الاسترجاع: {returnResponse.data.return_id}
                </Badge>
              )}
            </div>
            {returnResponse.error && (
              <p className="text-xs sm:text-sm mt-1 sm:mt-2">الخطأ: {returnResponse.error}</p>
            )}
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {selectedInvoice && (
            <>
              {/* Card layout for small screens */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:hidden">
                {selectedInvoice.items.map(renderItemCard)}
              </div>
              {/* Table layout for medium and larger screens */}
              <div className="hidden md:block">
                {renderItemTable()}
              </div>
            </>
          )}
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-start gap-2 mt-3 sm:mt-4">
          <Button
            type="button"
            onClick={() => onConfirmReturn(true)}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-4 w-full sm:w-auto"
            disabled={isLoading || Object.values(returnItems).every((q) => q === 0)}
          >
            {isLoading ? "جاري المعالجة..." : "تأكيد وطباعة"}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirmReturn(false)}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-4 w-full sm:w-auto"
            disabled={isLoading || Object.values(returnItems).every((q) => q === 0)}
          >
            {isLoading ? "جاري المعالجة..." : "تأكيد بدون طباعة"}
          </Button>
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="secondary" 
              className="dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 text-xs sm:text-sm py-2 px-3 sm:py-2.5 sm:px-4 w-full sm:w-auto"
              disabled={isLoading}
            >
              إغلاق
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnDialog;