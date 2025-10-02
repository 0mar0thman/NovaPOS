import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, RefreshCw, UserPlus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import Select, { SingleValue } from "react-select";
import {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  Product,
  ProductOption,
  Supplier,
  SupplierOption,
} from "../types/types";
import { safeToFixed, validatePhone } from "../types/utils";

interface InvoiceFormDialogProps {
  invoice?: PurchaseInvoice | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  products: Product[];
  productOptions: ProductOption[];
  setInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
}

export const InvoiceFormDialog = ({
  invoice,
  isOpen,
  onOpenChange,
  onSuccess,
  products,
  productOptions,
  setInvoices,
}: InvoiceFormDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: "",
    supplier_id: 0,
    date: new Date().toISOString().split("T")[0],
    amount_paid: 0,
    notes: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [invoiceItems, setInvoiceItems] = useState<PurchaseInvoiceItem[]>([
    {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      number_of_units: 1,
      amount_paid: 0,
      total_price: 0,
      expiry_date: new Date().toISOString().split("T")[0],
    },
  ]);
  const [amountPaidError, setAmountPaidError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    notes: "",
  });
  const [supplierErrors, setSupplierErrors] = useState<{
    [key: string]: string;
  }>({});
  const [selectedSupplierPhone, setSelectedSupplierPhone] = useState("");
  const { toast } = useToast();
  const [editingItemIndex, setEditingItemIndex] = useState<number>(-1);
  const itemRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isEdit = !!invoice;

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      if (invoice) {
        loadInvoiceData();
      } else {
        resetForm();
        fetchLastInvoiceNumber();
      }
    }
  }, [isOpen, invoice]);

  useEffect(() => {
    if (editingItemIndex >= 0 && itemRefs.current[editingItemIndex]) {
      itemRefs.current[editingItemIndex]?.focus();
    }
  }, [editingItemIndex]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, invoiceItems.length);
  }, [invoiceItems.length]);

  const loadInvoiceData = () => {
    if (!invoice) return;

    setInvoiceData({
      invoice_number: invoice.invoice_number,
      supplier_id: invoice.supplier_id || 0,
      date: new Date(invoice.date).toISOString().split("T")[0],
      amount_paid: invoice.amount_paid || 0,
      notes: invoice.notes || "",
    });

    const loadedItems =
      invoice.items.length > 0
        ? invoice.items.map((item) => {
            const calculatedTotal =
              (item.quantity || 1) *
              (item.unit_price || 0) *
              (item.number_of_units || 1);
            return {
              id: item.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              number_of_units: item.number_of_units || 1,
              amount_paid: parseFloat(Number(item.amount_paid).toFixed(2)),
              total_price: calculatedTotal,
              expiry_date: item.expiry_date || "",
            };
          })
        : [
            {
              product_id: 0,
              quantity: 1,
              unit_price: 0,
              number_of_units: 1,
              amount_paid: 0,
              total_price: 0,
              expiry_date: new Date().toISOString().split("T")[0],
            },
          ];

    setInvoiceItems(loadedItems);

    const sumPaid = (loadedItems ?? []).reduce(
      (sum: number, i) => sum + i.amount_paid,
      0
    );
    setInvoiceData((prev) => ({
      ...prev,
      amount_paid: parseFloat(sumPaid.toFixed(2)),
    }));

    if (invoice.supplier) {
      setSelectedSupplierPhone(invoice.supplier.phone || "");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const supplierData = Array.isArray(response.data.data.data)
        ? response.data.data.data
        : [];
      setSuppliers(supplierData);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setSuppliers([]);
      toast({
        title: "خطأ",
        description: "فشل جلب قائمة الموردين",
        variant: "destructive",
      });
    }
  };

  const fetchLastInvoiceNumber = async () => {
    try {
      const response = await api.get(
        `/api/purchase-invoices/last-invoice-number`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      if (response.data.success && response.data.next_invoice_number) {
        setInvoiceData((prev) => ({
          ...prev,
          invoice_number: response.data.next_invoice_number,
        }));
      } else {
        throw new Error("لم يتم إرجاع رقم فاتورة صالح");
      }
    } catch (error) {
      console.error("Error fetching last invoice number:", error);
      setInvoiceData((prev) => ({ ...prev, invoice_number: "INV-001" }));
      toast({
        title: "خطأ",
        description: "فشل جلب رقم الفاتورة التالي، تم تعيين INV-001",
        variant: "destructive",
      });
    }
  };

  const { totalAmount, remainingAmount } = useMemo(() => {
    const total = invoiceItems.reduce(
      (total, item) => total + (item.total_price || 0),
      0
    );
    const paid = invoiceData.amount_paid || 0;
    return {
      totalAmount: total,
      remainingAmount: total - paid,
    };
  }, [invoiceItems, invoiceData.amount_paid]);

  const validateAmountPaid = (value: number) => {
    if (isNaN(value)) {
      setAmountPaidError("المبلغ المدفوع يجب أن يكون رقمًا صالحًا");
      return false;
    }
    if (value < 0) {
      setAmountPaidError("المبلغ المدفوع لا يمكن أن يكون سالبًا");
      return false;
    }
    if (value > totalAmount) {
      setAmountPaidError("المبلغ المدفوع لا يمكن أن يتجاوز إجمالي الفاتورة");
      return false;
    }
    setAmountPaidError(null);
    return true;
  };

  const validateItems = (items: PurchaseInvoiceItem[]) => {
    return items.every(
      (item) =>
        item.product_id > 0 &&
        item.quantity > 0 &&
        item.unit_price >= 0 &&
        item.number_of_units > 0
    );
  };

  const validateItemsAmountPaid = (items: PurchaseInvoiceItem[]) => {
    return items.every((item) => {
      const itemTotal = item.quantity * item.unit_price * item.number_of_units;
      return item.amount_paid <= itemTotal;
    });
  };

  const resetAmountPaid = () => {
    setInvoiceData((prev) => ({
      ...prev,
      amount_paid: totalAmount,
    }));

    const updatedItems = invoiceItems.map((item) => {
      const itemTotal =
        (item.quantity || 1) *
        (item.unit_price || 0) *
        (item.number_of_units || 1);
      return {
        ...item,
        amount_paid: parseFloat(itemTotal.toFixed(2)),
      };
    });

    setInvoiceItems(updatedItems);
    setAmountPaidError(null);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      {
        product_id: 0,
        quantity: 1,
        unit_price: 0,
        number_of_units: 1,
        amount_paid: 0,
        total_price: 0,
        expiry_date: new Date().toISOString().split("T")[0],
      },
    ]);
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...invoiceItems];
    let parsedValue: number | string;

    if (["quantity", "number_of_units"].includes(field)) {
      parsedValue = parseInt(value) || 1;
    } else if (field === "unit_price") {
      parsedValue = parseFloat(value) || 0;
      parsedValue = parseFloat(parsedValue.toFixed(2));
    } else {
      parsedValue = value;
    }

    updatedItems[index] = { ...updatedItems[index], [field]: parsedValue };

    if (["quantity", "unit_price", "number_of_units"].includes(field)) {
      const quantity = updatedItems[index].quantity || 1;
      const unit_price = updatedItems[index].unit_price || 0;
      const number_of_units = updatedItems[index].number_of_units || 1;
      updatedItems[index].total_price = quantity * unit_price * number_of_units;
    }

    setInvoiceItems(updatedItems);
    validateForm();
  };

  const handleProductChange = (
    index: number,
    selectedOption: SingleValue<ProductOption>
  ) => {
    if (selectedOption) {
      const updatedItems = [...invoiceItems];
      const itemTotal =
        (updatedItems[index].quantity || 1) *
        (selectedOption.product.purchase_price || 0) *
        (updatedItems[index].number_of_units || 1);

      updatedItems[index] = {
        ...updatedItems[index],
        product_id: selectedOption.value,
        unit_price: selectedOption.product.purchase_price || 0,
        total_price: itemTotal,
      };

      setInvoiceItems(updatedItems);
      validateForm();
    }
  };

  const handleAmountPaidChange = (value: number) => {
    const validatedValue = Math.min(value, totalAmount);

    setInvoiceData((prev) => ({
      ...prev,
      amount_paid: parseFloat(validatedValue.toFixed(2)),
    }));

    validateAmountPaid(validatedValue);
    validateForm();

    if (totalAmount > 0) {
      let updatedItems = invoiceItems.map((item) => ({
        ...item,
        amount_paid: parseFloat(
          ((item.total_price / totalAmount) * validatedValue).toFixed(2)
        ),
      }));

      const currentSum = updatedItems.reduce(
        (sum, item) => sum + item.amount_paid,
        0
      );
      const diff = validatedValue - currentSum;
      if (updatedItems.length > 0 && diff !== 0) {
        updatedItems[updatedItems.length - 1].amount_paid += diff;
        updatedItems[updatedItems.length - 1].amount_paid = Math.max(
          0,
          parseFloat(
            updatedItems[updatedItems.length - 1].amount_paid.toFixed(2)
          )
        );
        if (
          updatedItems[updatedItems.length - 1].amount_paid >
          updatedItems[updatedItems.length - 1].total_price
        ) {
          updatedItems[updatedItems.length - 1].amount_paid =
            updatedItems[updatedItems.length - 1].total_price;
        }
      }

      setInvoiceItems(updatedItems);

      const newTotalPaid = updatedItems.reduce(
        (sum, item) => sum + item.amount_paid,
        0
      );
      setInvoiceData((prev) => ({
        ...prev,
        amount_paid: parseFloat(newTotalPaid.toFixed(2)),
      }));
    }
  };

  const adjustOtherItems = (editedIndex: number) => {
    const targetTotal = invoiceData.amount_paid;
    const editedPaid = invoiceItems[editedIndex].amount_paid;
    let requiredOther = targetTotal - editedPaid;

    if (requiredOther < 0) {
      toast({
        title: "خطأ",
        description: "المبلغ المدفوع للبند يتجاوز الإجمالي للفاتورة",
        variant: "destructive",
      });
      const updatedItems = [...invoiceItems];
      updatedItems[editedIndex].amount_paid = targetTotal;
      invoiceItems.forEach((_, i) => {
        if (i !== editedIndex) updatedItems[i].amount_paid = 0;
      });
      setInvoiceItems(updatedItems);

      const newTotalPaid = updatedItems.reduce(
        (sum, item) => sum + item.amount_paid,
        0
      );
      setInvoiceData((prev) => ({
        ...prev,
        amount_paid: parseFloat(newTotalPaid.toFixed(2)),
      }));
      return;
    }

    const otherIndices = invoiceItems
      .map((_, i) => i)
      .filter((i) => i !== editedIndex);
    if (otherIndices.length === 0) return;

    const otherTotalWeight = otherIndices.reduce(
      (sum, i) => sum + invoiceItems[i].total_price,
      0
    );
    if (otherTotalWeight === 0) return;

    const updatedItems = [...invoiceItems];
    let remaining = requiredOther;

    otherIndices.forEach((i) => {
      const proportion = invoiceItems[i].total_price / otherTotalWeight;
      let assigned = proportion * requiredOther;
      assigned = Math.min(assigned, updatedItems[i].total_price);
      updatedItems[i].amount_paid = parseFloat(assigned.toFixed(2));
      remaining -= assigned;
    });

    if (remaining > 0) {
      for (const i of otherIndices) {
        const available =
          updatedItems[i].total_price - updatedItems[i].amount_paid;
        if (available > 0) {
          const add = Math.min(remaining, available);
          updatedItems[i].amount_paid += add;
          updatedItems[i].amount_paid = parseFloat(
            updatedItems[i].amount_paid.toFixed(2)
          );
          remaining -= add;
          if (remaining <= 0) break;
        }
      }
    }

    if (remaining > 0) {
      toast({
        title: "تحذير",
        description:
          "لا يمكن توزيع المبلغ بالكامل بسبب حدود الأسعار، تم إضافة المتبقي إلى البند الحالي",
        variant: "destructive",
      });
      updatedItems[editedIndex].amount_paid += remaining;
      updatedItems[editedIndex].amount_paid = parseFloat(
        updatedItems[editedIndex].amount_paid.toFixed(2)
      );
    }

    setInvoiceItems(updatedItems);

    const newTotalPaid = updatedItems.reduce(
      (sum, item) => sum + item.amount_paid,
      0
    );
    setInvoiceData((prev) => ({
      ...prev,
      amount_paid: parseFloat(newTotalPaid.toFixed(2)),
    }));
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      const updatedItems = invoiceItems.filter((_, i) => i !== index);
      setInvoiceItems(updatedItems);
      validateForm();
    } else {
      toast({
        title: "تحذير",
        description: "يجب أن تحتوي الفاتورة على بند واحد على الأقل",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setInvoiceData({
      invoice_number: "",
      supplier_id: 0,
      date: new Date().toISOString().split("T")[0],
      amount_paid: 0,
      notes: "",
    });
    setInvoiceItems([
      {
        product_id: 0,
        quantity: 1,
        unit_price: 0,
        number_of_units: 1,
        amount_paid: 0,
        total_price: 0,
        expiry_date: new Date().toISOString().split("T")[0],
      },
    ]);
    setErrors({});
    setAmountPaidError(null);
    setNewSupplier({ name: "", phone: "", notes: "" });
    setSupplierErrors({});
    setSelectedSupplierPhone("");
    setEditingItemIndex(-1);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!invoiceData.invoice_number.trim()) {
      newErrors.invoice_number = "رقم الفاتورة مطلوب";
    }

    if (!invoiceData.supplier_id) {
      newErrors.supplier_id = "يجب اختيار مورد";
    }

    if (!invoiceData.date) {
      newErrors.date = "تاريخ الفاتورة مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSupplierForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!newSupplier.name.trim()) {
      newErrors.name = "اسم المورد مطلوب";
    }

    if (!newSupplier.phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!validatePhone(newSupplier.phone)) {
      newErrors.phone = "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01";
    }

    setSupplierErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSupplierChange = (
    selectedOption: SingleValue<SupplierOption>
  ) => {
    if (selectedOption) {
      setInvoiceData((prev) => ({
        ...prev,
        supplier_id: selectedOption.value,
      }));
      setSelectedSupplierPhone(selectedOption.phone || "");
      setErrors((prev) => ({ ...prev, supplier_id: "" }));
    } else {
      setInvoiceData((prev) => ({
        ...prev,
        supplier_id: 0,
      }));
      setSelectedSupplierPhone("");
      setErrors((prev) => ({ ...prev, supplier_id: "يجب اختيار مورد" }));
    }
    validateForm();
  };

  const handleAddSupplier = async () => {
    if (!validateSupplierForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء في حقول المورد",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.post(
        "/api/suppliers",
        {
          name: newSupplier.name,
          phone: newSupplier.phone,
          notes: newSupplier.notes || null,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );
      const newSupplierData = response.data;
      await fetchSuppliers();
      setInvoiceData((prev) => ({ ...prev, supplier_id: newSupplierData.id }));
      setSelectedSupplierPhone(newSupplier.phone);
      setErrors((prev) => ({ ...prev, supplier_id: "" }));
      setIsSupplierModalOpen(false);
      setNewSupplier({ name: "", phone: "", notes: "" });
      setSupplierErrors({});
      toast({
        title: "تم الإضافة",
        description: `تم إضافة المورد ${newSupplier.name} بنجاح`,
      });
      validateForm();
    } catch (error: any) {
      console.error("Error adding supplier:", error);
      let errorMessage = "حدث خطأ أثناء إضافة المورد";
      if (error.response?.status === 422) {
        errorMessage =
          error.response.data.message || "البيانات المرسلة غير صالحة";
        if (error.response.data.errors) {
          errorMessage = Object.values(error.response.data.errors)
            .flat()
            .join(", ");
        }
      } else if (error.response?.status === 401) {
        errorMessage = "غير مصرح بالوصول، يرجى تسجيل الدخول أولاً";
      }
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const supplierOptions = useMemo(() => {
    return suppliers?.map((supplier) => ({
      value: supplier.id,
      label: `${supplier.name || "بدون اسم"} (${supplier.phone || "بدون رقم"})`,
      phone: supplier.phone,
    }));
  }, [suppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء في الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const validItems = invoiceItems.filter(
      (item) =>
        item.product_id > 0 &&
        item.quantity > 0 &&
        item.unit_price >= 0 &&
        item.number_of_units > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إضافة منتج واحد على الأقل مع تحديد السعر والكمية",
        variant: "destructive",
      });
      return;
    }

    if (!validateItemsAmountPaid(validItems)) {
      toast({
        title: "خطأ في المبلغ المدفوع",
        description: "المبلغ المدفوع للبند يتجاوز إجمالي البند",
        variant: "destructive",
      });
      return;
    }

    if (!validateAmountPaid(invoiceData.amount_paid)) {
      toast({
        title: "خطأ في المبلغ المدفوع",
        description: amountPaidError || "المبلغ المدفوع غير صالح",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const invoicePayload = {
        invoice_number: invoiceData.invoice_number,
        date: invoiceData.date,
        supplier_id: invoiceData.supplier_id,
        amount_paid: parseFloat(invoiceData.amount_paid.toFixed(2)),
        notes: invoiceData.notes || null,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          number_of_units: item.number_of_units || 1,
          amount_paid: parseFloat(Number(item.amount_paid).toFixed(2)),
          expiry_date: item.expiry_date || null,
        })),
      };

      if (invoice) {
        const response = await api.patch(
          `/api/purchase-invoices/${invoice.id}`,
          invoicePayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        setInvoices((prev) =>
          prev.map((inv) => (inv.id === invoice.id ? response.data : inv))
        );
        toast({
          title: "تم التحديث",
          description: `تم تحديث فاتورة الشراء ${response.data.invoice_number} بنجاح`,
        });
      } else {
        const response = await api.post(
          "/api/purchase-invoices",
          invoicePayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        setInvoices((prev) => [response.data, ...prev]);
        toast({
          title: "تم الحفظ",
          description: `تم إضافة فاتورة الشراء ${response.data.invoice_number} بنجاح`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      let errorMessage = "حدث خطأ أثناء حفظ الفاتورة";
      if (error.response?.status === 401) {
        errorMessage = "غير مصرح بالوصول، يرجى تسجيل الدخول أولاً";
      } else if (error.response?.status === 422) {
        errorMessage =
          error.response.data.message || "البيانات المرسلة غير صالحة";
        if (error.response.data.errors) {
          errorMessage = Object.values(error.response.data.errors)
            .flat()
            .join(", ");
        }
      } else if (error.response?.status === 500) {
        errorMessage = error.response.data.message || "حدث خطأ داخلي في الخادم";
      }
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          onOpenChange(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent
          className="sm:max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-slate-700 rounded-xl p-4 sm:p-6"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {invoice
                ? `تعديل فاتورة شراء ${invoice.invoice_number}`
                : "إضافة فاتورة شراء جديدة"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              يرجى تعبئة جميع الحقول المطلوبة قبل حفظ الفاتورة
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Invoice Number */}
              <div className="space-y-2 md:col-span-3">
                <Label
                  htmlFor="invoiceNumber"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  رقم الفاتورة *
                </Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceData.invoice_number}
                  onChange={(e) => {
                    setInvoiceData({
                      ...invoiceData,
                      invoice_number: e.target.value,
                    });
                    setErrors((prev) => ({
                      ...prev,
                      invoice_number: e.target.value.trim()
                        ? ""
                        : "رقم الفاتورة مطلوب",
                    }));
                  }}
                  placeholder="INV-001"
                  required
                  disabled={isLoading || !!invoice}
                  className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                />
                {errors.invoice_number && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.invoice_number}
                  </p>
                )}
              </div>

              {/* Supplier Selection */}
              <div className="space-y-2 md:col-span-4">
                <Label
                  htmlFor="supplierId"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  المورد *
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      options={supplierOptions}
                      value={supplierOptions.find(
                        (option) => option.value === invoiceData.supplier_id
                      )}
                      onChange={handleSupplierChange}
                      placeholder="اختر موردًا..."
                      isSearchable
                      isClearable
                      noOptionsMessage={() => "لا توجد موردين متاحين"}
                      className="text-right"
                      classNamePrefix="select"
                      isDisabled={isLoading || isEdit}
                      styles={{
                        control: (base, { isFocused }) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          borderColor: isFocused ? "#3b82f6" : "#e5e7eb",
                          boxShadow: isFocused
                            ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                            : "0 1px 3px rgba(0, 0, 0, 0.05)",
                          "&:hover": { borderColor: "#3b82f6" },
                          minHeight: "2.5rem",
                          padding: "0.25rem",
                          backgroundColor: "#fff",
                          fontSize: "0.875rem",
                          color: "#1f2937",
                          ".dark &": {
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                            color: "#f8fafc",
                          },
                        }),
                        option: (base, { isFocused, isSelected }) => ({
                          ...base,
                          backgroundColor: isSelected
                            ? "#3b82f6"
                            : isFocused
                            ? "#eff6ff"
                            : "#fff",
                          color: isSelected ? "#fff" : "#1f2937",
                          textAlign: "right",
                          padding: "0.5rem 0.75rem",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          ".dark &": {
                            backgroundColor: isSelected
                              ? "#3b82f6"
                              : isFocused
                              ? "#1e40af"
                              : "#1e293b",
                            color: isSelected ? "#fff" : "#f8fafc",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                          borderRadius: "0.5rem",
                          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                          backgroundColor: "#fff",
                          ".dark &": {
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                          },
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: "#1f2937",
                          fontSize: "0.875rem",
                          ".dark &": {
                            color: "#f8fafc",
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          textAlign: "right",
                          color: "#1f2937",
                          fontSize: "0.875rem",
                          ".dark &": {
                            color: "#f8fafc",
                          },
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#9ca3af",
                          fontSize: "0.875rem",
                        }),
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSupplierModalOpen(true)}
                    disabled={isLoading || isEdit}
                    className="h-10 px-3 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                    title="إضافة مورد جديد"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                  </Button>
                </div>
                {errors.supplier_id && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.supplier_id}
                  </p>
                )}
              </div>

              {/* Supplier Phone */}
              <div className="space-y-2 md:col-span-3">
                <Label
                  htmlFor="supplierPhone"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  رقم المورد
                </Label>
                <Input
                  id="supplierPhone"
                  value={selectedSupplierPhone}
                  disabled
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-gray-100 dark:bg-slate-700 cursor-not-allowed rounded-lg shadow-sm"
                />
              </div>

              {/* Date */}
              <div className="space-y-2 md:col-span-2">
                <Label
                  htmlFor="date"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  تاريخ الفاتورة *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={invoiceData.date}
                  onChange={(e) => {
                    setInvoiceData({ ...invoiceData, date: e.target.value });
                    setErrors((prev) => ({
                      ...prev,
                      date: e.target.value ? "" : "تاريخ الفاتورة مطلوب",
                    }));
                  }}
                  required
                  disabled={isLoading || isEdit}
                  style={{
                    textAlign: "center",
                    paddingRight: "0",
                    paddingLeft: "50px",
                  }}
                  className="text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                />
                {errors.date && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.date}
                  </p>
                )}
              </div>
            </div>

            {/* Additional Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Amount Paid */}
              <div className="space-y-2 md:col-span-4">
                <Label
                  htmlFor="amountPaid"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  المبلغ المدفوع
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceData.amount_paid}
                    onChange={(e) =>
                      handleAmountPaidChange(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    disabled={isLoading}
                    className={`pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200 flex-1 ${
                      amountPaidError
                        ? "border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900"
                        : ""
                    }`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetAmountPaid}
                    disabled={isLoading}
                    className="h-10 w-10 p-0 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                    title="إعادة تعيين المبلغ المدفوع"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {amountPaidError && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {amountPaidError}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-8">
                <Label
                  htmlFor="notes"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  ملاحظات
                </Label>
                <Input
                  id="notes"
                  value={invoiceData.notes || ""}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, notes: e.target.value })
                  }
                  placeholder="ملاحظات إضافية"
                  disabled={isLoading || isEdit}
                  className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold text-gray-800 dark:text-gray-200">
                  بنود الفاتورة
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInvoiceItem}
                  disabled={isLoading || isEdit}
                  className="h-10 px-3 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  إضافة بند
                </Button>
              </div>

              <div className="space-y-3">
                {invoiceItems.map((item, index) => {
                  const product = products.find(
                    (p) => p.id === item.product_id
                  );
                  const isEditing = editingItemIndex === index;
                  return (
                    <Card
                      key={index}
                      className="p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg shadow-sm"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Product Selection */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            المنتج *
                          </Label>
                          <Select
                            options={productOptions}
                            value={productOptions.find(
                              (option) => option.value === item.product_id
                            )}
                            onChange={(selectedOption) =>
                              handleProductChange(index, selectedOption)
                            }
                            placeholder="اختر منتجًا"
                            isSearchable
                            noOptionsMessage={() => "لا توجد منتجات"}
                            className="text-right"
                            classNamePrefix="select"
                            isDisabled={isLoading || isEdit}
                            styles={{
                              control: (base, { isFocused }) => ({
                                ...base,
                                borderRadius: "0.5rem",
                                borderColor: isFocused ? "#3b82f6" : "#e5e7eb",
                                boxShadow: isFocused
                                  ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                                  : "0 1px 3px rgba(0, 0, 0, 0.05)",
                                "&:hover": { borderColor: "#3b82f6" },
                                minHeight: "2.5rem",
                                padding: "0.25rem",
                                backgroundColor: "#fff",
                                fontSize: "0.875rem",
                                color: "#1f2937",
                                ".dark &": {
                                  backgroundColor: "#1e293b",
                                  borderColor: "#334155",
                                  color: "#f8fafc",
                                },
                              }),
                              option: (base, { isFocused, isSelected }) => ({
                                ...base,
                                backgroundColor: isSelected
                                  ? "#3b82f6"
                                  : isFocused
                                  ? "#eff6ff"
                                  : "#fff",
                                color: isSelected ? "#fff" : "#1f2937",
                                textAlign: "right",
                                padding: "0.5rem 0.75rem",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                ".dark &": {
                                  backgroundColor: isSelected
                                    ? "#3b82f6"
                                    : isFocused
                                    ? "#1e40af"
                                    : "#1e293b",
                                  color: isSelected ? "#fff" : "#f8fafc",
                                },
                              }),
                              menu: (base) => ({
                                ...base,
                                zIndex: 9999,
                                borderRadius: "0.5rem",
                                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                backgroundColor: "#fff",
                                ".dark &": {
                                  backgroundColor: "#1e293b",
                                  borderColor: "#334155",
                                },
                              }),
                              singleValue: (base) => ({
                                ...base,
                                color: "#1f2937",
                                fontSize: "0.875rem",
                                ".dark &": {
                                  color: "#f8fafc",
                                },
                              }),
                              input: (base) => ({
                                ...base,
                                textAlign: "right",
                                color: "#1f2937",
                                fontSize: "0.875rem",
                                ".dark &": {
                                  color: "#f8fafc",
                                },
                              }),
                              placeholder: (base) => ({
                                ...base,
                                color: "#9ca3af",
                                fontSize: "0.875rem",
                              }),
                            }}
                          />
                        </div>

                        {/* Category */}
                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            الفئة
                          </Label>
                          {product?.category ? (
                            <Badge
                              className="text-xs py-1 px-2 h-10 w-full justify-center text-gray-200"
                              style={{
                                backgroundColor: product.category.color,
                              }}
                            >
                              {product.category.name}
                            </Badge>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400 h-10 flex items-center justify-center">
                              غير محدد
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            الوحدة *
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            required
                            disabled={isLoading || isEdit}
                            className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                          />
                        </div>

                        {/* Units */}
                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            الكمية *
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.number_of_units}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "number_of_units",
                                e.target.value
                              )
                            }
                            required
                            disabled={isLoading || isEdit}
                            className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            سعر الكمية *
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "unit_price",
                                e.target.value
                              )
                            }
                            required
                            disabled={isLoading || isEdit}
                            className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                          />
                        </div>

                        {/* Total Price */}
                        <div className="space-y-2 md:col-span-1">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            الإجمالي
                          </Label>
                          <div className="h-10 flex items-center px-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm">
                            {safeToFixed(item.total_price)}
                          </div>
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            تاريخ انتهاء الصلاحية
                          </Label>
                          <Input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) =>
                              updateInvoiceItem(
                                index,
                                "expiry_date",
                                e.target.value
                              )
                            }
                            disabled={isLoading || isEdit}
                            style={{
                              textAlign: "center",
                              paddingRight: "0",
                              paddingLeft: "50px",
                            }}
                            className="border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                          />
                        </div>

                        {/* Amount Paid */}
                        <div className="space-y-2 md:col-span-2 w-full">
                          <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            المبلغ المدفوع
                          </Label>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <div className="relative flex-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.amount_paid}
                                  onChange={(e) => {
                                    const value =
                                      parseFloat(e.target.value) || 0;
                                    const maxValue = item.total_price || 0;
                                    const updatedItems = [...invoiceItems];
                                    updatedItems[index].amount_paid = Math.min(
                                      value,
                                      maxValue
                                    );
                                    setInvoiceItems(updatedItems);
                                  }}
                                  onBlur={() => {
                                    adjustOtherItems(index);
                                    setEditingItemIndex(-1);
                                  }}
                                  disabled={isLoading}
                                  className="h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                                  ref={(el) => (itemRefs.current[index] = el)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingItemIndex(index)}
                                  disabled={isLoading || isEditing}
                                  className="hidden absolute top-1/2 left-1 -translate-y-1/2 h-8 px-2 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="relative flex-1">
                                <div className="h-10 flex items-center px-3 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm">
                                  {safeToFixed(item.amount_paid)}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingItemIndex(index)}
                                  disabled={isLoading || isEditing}
                                  className="absolute top-1/2 left-1 -translate-y-1/2 h-8 px-2 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-end md:col-span-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeInvoiceItem(index)}
                            disabled={
                              invoiceItems.length === 1 || isLoading || isEdit
                            }
                            className="h-9 w-10 p-0 mb-2 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  إجمالي الفاتورة
                </p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {safeToFixed(totalAmount)} ج.م
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  المبلغ المدفوع
                </p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">
                  {safeToFixed(invoiceData.amount_paid)} ج.م
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  المبلغ المتبقي
                </p>
                <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {safeToFixed(remainingAmount)} ج.م
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <DialogFooter className="gap-2 sm:gap-3 sm:justify-start pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-sm text-white font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
                disabled={
                  isLoading ||
                  !!amountPaidError ||
                  Object.keys(errors).length > 0 ||
                  !validateItems(invoiceItems)
                }
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    {invoice ? "جاري التحديث..." : "جاري الحفظ..."}
                  </span>
                ) : invoice ? (
                  "تحديث الفاتورة"
                ) : (
                  "حفظ الفاتورة"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="text-sm border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Modal */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent
          className="sm:max-w-md bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-slate-700 rounded-xl p-4 sm:p-6"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              إضافة مورد جديد
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              يرجى تعبئة بيانات المورد الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Supplier Name */}
            <div className="space-y-2">
              <Label
                htmlFor="supplierName"
                className="text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                اسم المورد *
              </Label>
              <Input
                id="supplierName"
                value={newSupplier.name}
                onChange={(e) => {
                  setNewSupplier((prev) => ({ ...prev, name: e.target.value }));
                  setSupplierErrors((prev) => ({
                    ...prev,
                    name: e.target.value.trim() ? "" : "اسم المورد مطلوب",
                  }));
                }}
                placeholder="أدخل اسم المورد"
                required
                disabled={isLoading}
                className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
              />
              {supplierErrors.name && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {supplierErrors.name}
                </p>
              )}
            </div>

            {/* Supplier Phone */}
            <div className="space-y-2">
              <Label
                htmlFor="supplierPhone"
                className="text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                رقم الهاتف *
              </Label>
              <Input
                id="supplierPhone"
                value={newSupplier.phone}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value) && value.length <= 11) {
                    setNewSupplier((prev) => ({ ...prev, phone: value }));
                    setSupplierErrors((prev) => ({
                      ...prev,
                      phone: value.trim() ? "" : "رقم الهاتف مطلوب",
                    }));
                  }
                }}
                onBlur={() => {
                  if (!validatePhone(newSupplier.phone)) {
                    setSupplierErrors((prev) => ({
                      ...prev,
                      phone: "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01",
                    }));
                  } else {
                    setSupplierErrors((prev) => ({ ...prev, phone: "" }));
                  }
                }}
                placeholder="01XXXXXXXXX"
                required
                disabled={isLoading}
                className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                type="tel"
                inputMode="numeric"
              />
              {supplierErrors.phone && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {supplierErrors.phone}
                </p>
              )}
            </div>

            {/* Supplier Notes */}
            <div className="space-y-2">
              <Label
                htmlFor="supplierNotes"
                className="text-sm font-semibold text-gray-800 dark:text-gray-200"
              >
                ملاحظات
              </Label>
              <Input
                id="supplierNotes"
                value={newSupplier.notes}
                onChange={(e) =>
                  setNewSupplier((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="ملاحظات إضافية"
                disabled={isLoading}
                className="pr-3 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-3 sm:justify-start pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="button"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 hover:from-green-600 hover:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700 text-sm text-white font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
              onClick={handleAddSupplier}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  جاري الحفظ...
                </span>
              ) : (
                "حفظ المورد"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSupplierModalOpen(false);
                setNewSupplier({ name: "", phone: "", notes: "" });
                setSupplierErrors({});
              }}
              disabled={isLoading}
              className="text-sm border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
