import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Spinner from 'react-spinner';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Customer } from "./SalesInvoices";

const customerSchema = z.object({
  name: z.string().min(2, "يجب أن يكون الاسم على الأقل حرفين").max(255, "الاسم طويل جدًا"),
  phone: z
    .string()
    .min(10, "يجب أن يكون الهاتف على الأقل 10 أرقام")
    .max(20, "رقم الهاتف طويل جدًا")
    .regex(/^01[0-2,5]\d{8}$/, "رقم الهاتف غير صالح. يجب أن يكون 11 رقمًا ويبدأ بـ 01")
    .optional()
    .or(z.literal("")),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  address: z.string().max(255, "العنوان طويل جدًا").optional(),
  notes: z.string().max(500, "الملاحظات طويلة جدًا").optional(),
});

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSubmit: (values: any) => void;
  isLoading: boolean;
}

const CustomerFormDialog = ({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}: CustomerFormDialogProps) => {
  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  // تحديث القيم عند فتح الـ Dialog أو تغيير العميل
  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });
    }
  }, [customer, form]);

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      phone: values.phone || null,
      email: values.email || null,
      address: values.address || null,
      notes: values.notes || null,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md dark:bg-slate-800 dark:border-slate-700" dir="rtl">
        {/* ضمان متطلبات الوصول */}
        <DialogTitle className="dark:text-gray-200">
          {customer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
        </DialogTitle>
        <DialogDescription>
          {customer
            ? "يمكنك تعديل بيانات العميل وحفظ التغييرات."
            : "قم بإضافة عميل جديد عن طريق تعبئة الحقول التالية."}
        </DialogDescription>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-300">اسم العميل *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      placeholder="أدخل اسم العميل"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-300">رقم الهاتف (اختياري)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      placeholder="01xxxxxxxxx"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-300">البريد الإلكتروني (اختياري)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      placeholder="أدخل البريد الإلكتروني"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-300">العنوان (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      placeholder="أدخل العنوان"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-gray-300">ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      placeholder="أدخل ملاحظات"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="animate-spin h-4 w-4" />
                    جاري الحفظ...
                  </div>
                ) : customer ? (
                  "تحديث"
                ) : (
                  "إضافة"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormDialog;
