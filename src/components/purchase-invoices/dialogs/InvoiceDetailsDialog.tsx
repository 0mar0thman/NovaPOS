import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, History } from "lucide-react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import {
  PurchaseInvoice,
  PurchaseInvoiceVersion,
  PurchaseInvoiceItem,
} from "../types/types";
import { safeToFixed, formatDateTime } from "../types/utils";
import { PrintLayout } from "../components/PrintTemplate/PrintLayout";
import { number } from "prop-types";

interface InvoiceDetailsDialogProps {
  invoice: PurchaseInvoice | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceDetailsDialog = ({
  invoice,
  isOpen,
  onOpenChange,
}: InvoiceDetailsDialogProps) => {
  const [versions, setVersions] = useState<PurchaseInvoiceVersion[]>([]);
  const [isVersionsDialogOpen, setIsVersionsDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && invoice) {
      const fetchVersions = async () => {
        try {
          const response = await api.get(
            `/api/purchase-invoices/${invoice.id}/versions`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
              },
              params: { include: "cashier,updated_by,supplier" },
            }
          );
          const formattedVersions = response.data.map((version: any) => ({
            ...version,
            cashier: version.cashier
              ? {
                  ...version.cashier,
                  id: String(version.cashier.id),
                  deleted_at: version.cashier.deleted_at || null,
                }
              : undefined,
            creator: version.updated_by
              ? {
                  ...version.updated_by,
                  id: String(version.updated_by.id),
                  deleted_at: version.updated_by.deleted_at || null,
                }
              : undefined,
            user_id: String(version.user_id),
            cashier_name: version.cashier_name,
            user_name: version.user_name,
            cashier_display_name: version.cashier_display_name,
            user_display_name: version.user_display_name,
            is_cashier_deleted: version.is_cashier_deleted,
          }));
          setVersions(formattedVersions);
        } catch (error) {
          console.error("Error fetching invoice versions:", error);
          toast({
            title: "خطأ",
            description: "حدث خطأ أثناء استرجاع سجل التعديلات",
            variant: "destructive",
          });
        }
      };
      fetchVersions();
    }
  }, [isOpen, invoice, toast]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get("/api/get-user", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });
        if (response.data?.user) {
          setCurrentUser({
            id: String(response.data.user.id),
            name: response.data.user.name,
          });
        }
      } catch (error) {
        console.error("Failed to fetch current user", error);
        toast({
          title: "خطأ",
          description: "فشل تحميل بيانات المستخدم",
          variant: "destructive",
        });
      }
    };
    fetchCurrentUser();
  }, [toast]);

  const handlePrint = () => {
    if (!invoice || !currentUser) {
      toast({
        title: "خطأ",
        description: !invoice
          ? "لا توجد فاتورة للطباعة"
          : "بيانات المستخدم الحالي غير متوفرة",
        variant: "destructive",
      });
      return;
    }

    try {
  const userForPrint = {
    id: currentUser.id,
    name: currentUser.name,
  };
  PrintLayout(invoice, userForPrint);
  toast({
    title: "نجاح",
    description: "تمت الطباعة بنجاح",
    variant: "default",
  });
} catch (error: any) {
  console.error("Error during printing:", error);
  toast({
    title: "خطأ في الطباعة",
    description: error.message || "حدث خطأ أثناء محاولة الطباعة. يرجى المحاولة مرة أخرى.",
    variant: "destructive",
  });
}
  };

  if (!invoice) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-7xl max-h-[90vh] overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
          dir="rtl"
        >
          <DialogHeader className="no-print">
            <DialogTitle className="text-xl font-bold dark:text-white">
              تفاصيل فاتورة الشراء #{invoice.invoice_number}
            </DialogTitle>
            <DialogDescription className="text-lg dark:text-gray-300">
              معلومات الفاتورة وبنودها
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="dark:text-gray-300">
                <p className="font-semibold">رقم الفاتورة</p>
                <p className="text-base">{invoice.invoice_number}</p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">اسم المورد</p>
                <p className="text-base">
                  {invoice.supplier?.name || "غير محدد"}
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">اسم المستلم</p>
                <p className="text-base">
                  {invoice.cashier_display_name || invoice.user_display_name}
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">هاتف المورد</p>
                <p className="text-base">
                  {invoice.supplier?.phone || "غير محدد"}
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">التاريخ والوقت</p>
                <p className="text-base">
                  {formatDateTime(invoice.created_at)}
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">عدد المنتجات</p>
                <p className="text-base">{invoice.items?.length || 0}</p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">إجمالي الفاتورة</p>
                <p className="text-base">
                  {safeToFixed(invoice.total_amount)} ج.م
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">المبلغ المدفوع</p>
                <p className="text-base">
                  {safeToFixed(invoice.amount_paid)} ج.م
                </p>
              </div>
              <div className="dark:text-gray-300">
                <p className="font-semibold">المبلغ المتبقي</p>
                <p className="text-base">
                  {safeToFixed(
                    (invoice.total_amount ?? 0) - (invoice.amount_paid ?? 0)
                  )}{" "}
                  ج.م
                </p>
              </div>
              {invoice.notes && (
                <div className="md:col-span-3 dark:text-gray-300">
                  <p className="font-semibold">ملاحظات</p>
                  <p className="text-base">{invoice.notes}</p>
                </div>
              )}
            </div>
            <div>
              <p className="text-lg font-bold mb-4 dark:text-white">
                بنود الفاتورة
              </p>
              <Table className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow className="dark:border-gray-700">
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      #
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      المنتج
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      الفئة
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      الوحدة
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      الكمية
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      سعر الكمية
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      المبلغ المدفوع
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      الإجمالي
                    </TableHead>
                    <TableHead className="text-right text-base dark:text-gray-300 py-3">
                      تاريخ انتهاء الصلاحية
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow
                      key={index}
                      className="dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {invoice.items.length - index}
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {item.product?.name || "غير محدد"}
                      </TableCell>
                      <TableCell>
                        {item.product?.category ? (
                          <Badge
                            className="text-base print:bg-gray-200 print:text-black"
                            style={{
                              backgroundColor: item.product.category.color,
                            }}
                          >
                            {item.product.category.name}
                          </Badge>
                        ) : (
                          <span className="text-base dark:text-gray-300">
                            غير محدد
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {item.number_of_units}
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {safeToFixed(item.unit_price)} ج.م
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {safeToFixed(item.amount_paid)} ج.م
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {safeToFixed(item.total_price)} ج.م
                      </TableCell>
                      <TableCell className="text-base dark:text-gray-200 py-3">
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString(
                              "ar-EG"
                            )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <div className="text-center">
                <p className="text-base text-gray-600 dark:text-gray-400">
                  إجمالي الفاتورة
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {safeToFixed(invoice.total_amount)} ج.م
                </p>
              </div>
              <div className="text-center">
                <p className="text-base text-gray-600 dark:text-gray-400">
                  المبلغ المدفوع
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {safeToFixed(invoice.amount_paid)} ج.م
                </p>
              </div>
              <div className="text-center">
                <p className="text-base text-gray-600 dark:text-gray-400">
                  المبلغ المتبقي
                </p>
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {safeToFixed(
                    (invoice.total_amount ?? 0) - (invoice.amount_paid ?? 0)
                  )}{" "}
                  ج.م
                </p>
              </div>
            </div>
            <div className="flex gap-4 no-print">
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 h-9 hover:from-blue-600 hover:to-purple-600 dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700 dark:text-gray-200"
                onClick={handlePrint}
              >
                <Printer className="w-5 h-5 ml-2" />
                طباعة الفاتورة
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200"
                onClick={() => setIsVersionsDialogOpen(true)}
              >
                <History className="w-5 h-5 ml-2" />
                عرض سجل التعديلات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isVersionsDialogOpen}
        onOpenChange={setIsVersionsDialogOpen}
      >
        <DialogContent
          className="max-w-7xl max-h-[95vh] overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold dark:text-white">
              سجل تعديلات فاتورة #{invoice?.invoice_number}
            </DialogTitle>
            <DialogDescription className="text-lg dark:text-gray-300">
              سجل الإصدارات السابقة للفاتورة
            </DialogDescription>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-base dark:text-gray-300">
              لا توجد تعديلات سابقة لهذه الفاتورة
            </p>
          ) : (
            <div className="space-y-6">
              {versions.map((version, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm mb-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="dark:text-gray-300">
                      <p className="text-lg font-semibold">
                        الإصدار {versions.length - index} -{" "}
                        {new Date(version.created_at).toLocaleString("ar-EG")}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        تم التعديل بواسطة:{" "}
                        {version.updated_by?.name || "غير معروف"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-sm dark:border-gray-600 dark:text-gray-300"
                    >
                      {new Date(version.created_at).toLocaleString("ar-EG")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        إجمالي الفاتورة
                      </p>
                      <p className="text-lg font-semibold dark:text-white">
                        {safeToFixed(version.total_amount)} ج.م
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        المبلغ المدفوع
                      </p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {safeToFixed(version.amount_paid)} ج.م
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        المبلغ المتبقي
                      </p>
                      <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                        {safeToFixed(
                          (version.total_amount ?? 0) -
                            (version.amount_paid ?? 0)
                        )}{" "}
                        ج.م
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        اسم المستلم
                      </p>
                      <p className="text-lg font-semibold dark:text-white">
                        {version.cashier_display_name ||
                          version.user_display_name}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        اسم المورد
                      </p>
                      <p className="text-lg font-semibold dark:text-white">
                        {version.supplier_name || "غير محدد"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded dark:bg-gray-800">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        هاتف المورد
                      </p>
                      <p className="text-lg font-semibold dark:text-white">
                        {version.supplier_phone || "غير محدد"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-lg font-medium mb-2 dark:text-white">
                      بنود الفاتورة:
                    </p>
                    <Table className="border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                      <TableHeader className="bg-gray-50 dark:bg-gray-800">
                        <TableRow className="dark:border-gray-700">
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            المنتج
                          </TableHead>
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            الوحدة
                          </TableHead>
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            الكمية
                          </TableHead>
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            سعر الكمية
                          </TableHead>
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            المدفوع
                          </TableHead>
                          <TableHead className="text-right text-base dark:text-gray-300 py-3">
                            الإجمالي
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {version.items.map(
                          (item: PurchaseInvoiceItem, idx: number) => (
                            <TableRow
                              key={idx}
                              className="dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {item.product?.name || "غير محدد"}
                              </TableCell>
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {item.number_of_units}
                              </TableCell>
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {safeToFixed(item.unit_price)} ج.م
                              </TableCell>
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {safeToFixed(item.amount_paid)} ج.م
                              </TableCell>
                              <TableCell className="text-base dark:text-gray-300 py-3">
                                {safeToFixed(item.total_price)} ج.م
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};