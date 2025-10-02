import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2, Printer, Receipt, Wallet, CreditCard, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import debounce from "lodash/debounce";
import SelectComponent, { SingleValue, ActionMeta, InputActionMeta } from "react-select";
import Spinner from 'react-spinner';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Can } from '@/components/Can';

interface CartItem {
  id: string;
  name: string;
  sale_price: number;
  quantity: number;
  stock: number;
  category?: {
    name: string;
    color: string;
  };
}

type PaymentMethod = "cash" | "vodafone_cash" | "insta_pay";

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

interface CustomerOption {
  value: string;
  label: string;
  customer: Customer;
}

interface CartProps {
  cart: CartItem[];
  isLoading: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  customerId: string | null;
  setCustomerId: (value: string | null) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  calculateTotal: () => number;
  onCheckout: (printAfterSave: boolean, customerName: string, customerPhone: string, customerId: string | null) => void;
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  getPaymentMethodName?: (method: string) => string;
}

const customerSchema = z.object({
  name: z.string().min(2, "يجب أن يكون الاسم على الأقل حرفين").max(255, "الاسم طويل جدًا"),
  phone: z
    .string()
    .min(10, "يجب أن يكون الهاتف على الأقل 10 أرقام")
    .max(20, "رقم الهاتف طويل جدًا")
    .regex(/^01[0-2,5]\d{8}$/, "رقم الهاتف غير صالح. يجب أن يكون 11 رقمًا ويبدأ بـ 01")
    .optional()
    .or(z.literal("")),
});

const Cart = ({
  cart,
  isLoading,
  paymentMethod,
  setPaymentMethod,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerId,
  setCustomerId,
  updateQuantity,
  removeFromCart,
  calculateTotal,
  onCheckout,
  showHistory,
}: CartProps) => {
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const fetchCustomers = useCallback(
    debounce(async (searchTerm: string) => {
      try {
        setIsCustomerSearchLoading(true);
        const response = await api.get("/api/customers", {
          headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
          params: searchTerm ? { search: searchTerm } : {},
        });
        setCustomers(response.data.data || response.data);
      } catch (error: any) {
        console.error("Error fetching customers:", error);
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل جلب قائمة العملاء",
          variant: "destructive",
        });
      } finally {
        setIsCustomerSearchLoading(false);
      }
    }, 300),
    [toast]
  );

  useEffect(() => {
    fetchCustomers("");
  }, [fetchCustomers]);

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.name}${customer.phone ? ` (${customer.phone})` : ''}`,
    customer,
  }));

  const handleCustomerSubmit = async (values: any) => {
    if (values.phone && customers.some((c) => c.phone === values.phone)) {
      toast({
        title: "خطأ",
        description: "رقم الهاتف موجود بالفعل لعميل آخر",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerData = {
        name: values.name.trim(),
        phone: values.phone.trim() || null,
      };

      const response = await api.post("/api/customers", customerData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });

      const newCustomer = response.data;
      setCustomers([...customers, newCustomer]);
      setCustomerName(newCustomer.name);
      setCustomerPhone(newCustomer.phone || "");
      setCustomerId(newCustomer.id);
      setIsCustomerDialogOpen(false);
      form.reset({ name: "", phone: "" });

      toast({
        title: "تم إضافة العميل",
        description: `تم إضافة ${newCustomer.name} بنجاح`,
      });
    } catch (error: any) {
      console.error("Error adding customer:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل إضافة العميل",
        variant: "destructive",
      });
    }
  };

  const handleCustomerSelect = (
    option: SingleValue<CustomerOption>,
    actionMeta: ActionMeta<CustomerOption>
  ) => {
    if (actionMeta.action === "clear") {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerId(null);
      form.reset({ name: "", phone: "" });
      return;
    }
    if (option) {
      setCustomerName(option.customer.name);
      setCustomerPhone(option.customer.phone || "");
      setCustomerId(option.customer.id);
      form.setValue("name", option.customer.name);
      form.setValue("phone", option.customer.phone || "");
    }
  };

  const handleCustomerInputChange = (inputValue: string, actionMeta: InputActionMeta) => {
    if (actionMeta.action === "input-change") {
      setCustomerName(inputValue);
      setCustomerId(null); // Reset customerId when input changes
      fetchCustomers(inputValue);
    }
  };

  const handleCheckout = (printAfterSave: boolean) => {
    const nameToSend = customerName.trim() === "" ? "عميل فوري" : customerName;
    onCheckout(printAfterSave, nameToSend, customerPhone, customerId);
  };

  return (
    <>
      <Card
        className={`bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm sticky top-24  transition-all duration-300 ${
          showHistory
            ? "border-red-300 dark:border-red-700"
            : "border-blue-100 dark:border-blue-700"
        }`}
      >
        <CardHeader>
          <CardTitle
            className={`flex items-center gap-2 ${
              showHistory
                ? "text-red-800 dark:text-red-300"
                : "text-blue-800 dark:text-blue-300"
            }`}
          >
            <Receipt className="w-5 h-5" />
            سلة المشتريات
            {cart.length > 0 && (
              <Badge
                variant="secondary"
                className="mr-2 dark:bg-slate-700 dark:text-gray-200"
              >
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              السلة فارغة
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {item.sale_price.toFixed(2)} ج.م
                        </p>
                        {item.category && (
                          <Badge
                            className="text-xs text-white"
                            style={{ backgroundColor: item.category.color }}
                          >
                            {item.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={isLoading}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold dark:text-gray-300">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={isLoading || item.quantity >= item.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="dark:bg-red-700 dark:hover:bg-red-800"
                        onClick={() => removeFromCart(item.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="dark:bg-slate-700" />

              <div className="space-y-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="dark:text-gray-300">الإجمالي:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {calculateTotal().toFixed(2)} ج.م
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium dark:text-gray-300">
                    اسم العميل
                  </label>
                  <div className="space-y-2">
                    <Can action="create" subject="Customer">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        form.setValue("name", customerName || "");
                        form.setValue("phone", customerPhone || "");
                        setIsCustomerDialogOpen(true);
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 text-white border-none hover:from-blue-600 hover:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      إضافة عميل جديد
                    </Button>
                    </Can>
                    <Can action="read" subject="Customer">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <User className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                            <SelectComponent
                              options={customerOptions}
                              value={
                                customerId && customerName
                                  ? customerOptions.find(
                                      (option) => option.value === customerId
                                    ) || null
                                  : null
                              }
                              onChange={handleCustomerSelect}
                              onInputChange={handleCustomerInputChange}
                              inputValue={customerName}
                              placeholder="ابحث عن العميل أو أدخل اسمًا جديدًا..."
                              isClearable
                              isLoading={isCustomerSearchLoading}
                              noOptionsMessage={() => "لا توجد عملاء مطابقين"}
                              className="text-right"
                              classNamePrefix="select"
                              styles={{
                                control: (base) => ({
                                  ...base,
                                  borderRadius: "0.5rem",
                                  borderColor: "#e5e7eb",
                                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                                  "&:hover": { borderColor: "#3b82f6" },
                                  minHeight: "2.5rem",
                                  padding: "0.25rem",
                                  backgroundColor: "rgb(255 255 255)",
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
                                    : "#ffffff",
                                  color: isSelected ? "#ffffff" : "#1f2937",
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
                                    color: isSelected ? "#ffffff" : "#f8fafc",
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
                              formatOptionLabel={(option) => (
                                <div className="flex items-center justify-between">
                                  <span>{option.label}</span>
                                </div>
                              )}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                          <p>ابحث عن العميل أو أدخل اسمًا جديدًا</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    </Can>
                  </div>

                  <Button
                    onClick={() => handleCheckout(false)}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:from-blue-600 dark:to-indigo-600 dark:hover:from-blue-700 dark:hover:to-indigo-700 dark:text-gray-200"
                    disabled={isLoading || cart.length === 0}
                  >
                    {isLoading
                      ? "جاري المعالجة..."
                      : "إتمام البيع بدون طباعة (Ctrl+S)"}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-blue-200 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-slate-700"
                      onClick={() => handleCheckout(true)}
                      disabled={isLoading || cart.length === 0}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      طباعة الفاتورة (Ctrl+Alt+P)
                    </Button>
                    <Button
                      onClick={() => handleCheckout(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 dark:from-green-600 dark:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700 dark:text-gray-200"
                      disabled={isLoading || cart.length === 0}
                    >
                      {isLoading ? "جاري المعالجة..." : "بيع وطباعة (Ctrl+P)"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span className="font-medium dark:text-gray-300">
                      طريقة الدفع
                    </span>
                  </div>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={isLoading}
                  >
                    <SelectTrigger
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                      dir="rtl"
                    >
                      <SelectValue placeholder="اختر طريقة الدفع" />
                      <strong>
                        {paymentMethod === "cash"
                          ? "نقدي"
                          : paymentMethod === "vodafone_cash"
                          ? "فودافون كاش"
                          : "انستا باي"}
                      </strong>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem
                        value="cash"
                        className="dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center">
                          <Wallet className="w-4 h-4 mr-2" />
                          نقدي
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="vodafone_cash"
                        className="dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          فودافون كاش
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="insta_pay"
                        className="dark:hover:bg-slate-700"
                      >
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          انستا باي
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <span className="font-medium dark:text-gray-300">
                      {customerName || "عميل فوري"}{" "}
                      {customerPhone ? `(${customerPhone})` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
      >
        <DialogContent
          className="max-w-sm dark:bg-slate-800 dark:border-slate-700"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="dark:text-gray-200">
              إضافة عميل جديد
            </DialogTitle>
            <DialogDescription>
              أدخل اسم العميل ورقم الهاتف لإضافته بسرعة.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleCustomerSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="dark:text-gray-300">
                      اسم العميل *
                    </FormLabel>
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
                    <FormLabel className="dark:text-gray-300">
                      رقم الهاتف *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        placeholder="01xxxxxxxxx"
                        onChange={(e) => {
                          field.onChange(e);
                          setCustomerPhone(e.target.value);
                        }}
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
                    setIsCustomerDialogOpen(false);
                    form.reset({ name: "", phone: "" });
                  }}
                  className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Spinner className="animate-spin h-4 w-4" />
                      جاري الحفظ...
                    </div>
                  ) : (
                    "إضافة"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Cart;