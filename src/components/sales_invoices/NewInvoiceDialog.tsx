import { useState, useEffect, useCallback, useContext } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { X, Phone, User, FileText, Search, Receipt, Check, AlertCircle, Plus, Barcode, Zap, Hand } from "lucide-react";
import Select, { SingleValue, ActionMeta, InputActionMeta } from "react-select";
import { useToast } from "@/hooks/use-toast";
import type { Customer as SalesCustomer } from "../../components/sales_invoices/SalesInvoices";
import * as z from "zod";
import api from "@/lib/axios";
import debounce from "lodash/debounce";
import { AbilityContext } from "@/config/ability";
import { Can } from '@/components/Can';

const invoiceSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, "اسم العميل مطلوب"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  total_purchases: z.string().optional(),
  purchases_count: z.string().optional(),
  last_purchase_date: z.string().optional(),
});

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

interface NewInvoiceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  selectedProducts: { product: Product; quantity: number }[];
  setSelectedProducts: (products: { product: Product; quantity: number }[]) => void;
  isLoading: boolean;
  onCreateInvoice: (customerName: string, phone: string, notes: string, customerId?: string) => void;
  categories: Category[];
  productSearch: string;
  setProductSearch: (search: string) => void;
  isProductSearchLoading: boolean;
  customers: SalesCustomer[];
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  stock: number;
  barcode?: string;
  category?: {
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface ProductOption {
  value: string;
  label: string;
  product: Product;
}

interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

interface CustomerOption {
  value: string;
  label: string;
  customer: Customer;
}

const NewInvoiceDialog = ({
  isOpen,
  onOpenChange,
  products,
  selectedProducts,
  setSelectedProducts,
  isLoading,
  onCreateInvoice,
  categories,
  productSearch,
  setProductSearch,
  isProductSearchLoading,
  customers: propCustomers,
}: NewInvoiceDialogProps) => {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isBarcodeMode, setIsBarcodeMode] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [errors, setErrors] = useState<{ phone?: string }>({});
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [hasPreviousError, setHasPreviousError] = useState(false);
  const [lastFailedBarcode, setLastFailedBarcode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<SingleValue<CustomerOption>>(null);
  const [inputSearch, setInputSearch] = useState("");
  const [newProductFormData, setNewProductFormData] = useState({
    name: "",
    description: "",
    sale_price: "",
    purchase_price: "",
    stock: "",
    min_stock: "",
    barcode: "",
    category_id: "",
  });
  const [newCustomerFormData, setNewCustomerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const { toast } = useToast();
  const ability = useContext(AbilityContext);

  const AUTO_SUBMIT_LENGTH = 13;

  const productOptions: ProductOption[] = products.map((product) => ({
    value: product.id,
    label: `${product.name} (السعر: ${product.sale_price} ج.م | المخزون: ${product.stock} | الباركود: ${product.barcode || 'غير متوفر'})`,
    product,
  }));

  const categoryOptions: CategoryOption[] = (categories || []).map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color || "#6B7280",
  }));

  const customerOptions: CustomerOption[] = customers.map((customer) => ({
    value: customer.id,
    label: `${customer.name}${customer.phone ? ` (${customer.phone})` : ''}`,
    customer,
  }));

  const selectedCategory = categoryOptions.find(
    (option) => option.value === newProductFormData.category_id
  );

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

  // دالة جديدة لتحديث رقم الهاتف في قاعدة البيانات
  const updateCustomerPhone = useCallback(
    debounce(async (customerId: string, newPhone: string) => {
      if (!customerId || !newPhone) return;

      if (!validatePhoneNumber(newPhone)) {
        setErrors({ phone: "رقم الهاتف غير صالح. يجب أن يكون 11 رقمًا ويبدأ بـ 01" });
        return;
      }

      if (customers.some((c) => c.phone === newPhone && c.id !== customerId)) {
        setErrors({ phone: "رقم الهاتف موجود بالفعل لعميل آخر" });
        toast({
          title: "خطأ",
          description: "رقم الهاتف موجود بالفعل لعميل آخر",
          variant: "destructive",
        });
        return;
      }

      try {
        await api.put(
          `/api/customers/${customerId}`,
          { phone: newPhone.trim() || null },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
              "Content-Type": "application/json",
            },
          }
        );

        // تحديث قائمة العملاء محليًا
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customerId ? { ...c, phone: newPhone.trim() || undefined } : c
          )
        );

        toast({
          title: "تم التحديث",
          description: `تم تحديث رقم الهاتف للعميل بنجاح`,
        });
      } catch (error: any) {
        console.error("Error updating customer phone:", error);
        setErrors({ phone: error.response?.data?.message || "فشل تحديث رقم الهاتف" });
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل تحديث رقم الهاتف",
          variant: "destructive",
        });
      }
    }, 500),
    [toast, customers]
  );

  useEffect(() => {
    if (isOpen) {
      fetchCustomers("");
    }
  }, [isOpen, fetchCustomers]);

  const handleAddProduct = (option: SingleValue<ProductOption>) => {
    if (!option) return;
    const product = option.product;
    const existingProduct = selectedProducts.find((p) => p.product.id === product.id);
    if (existingProduct) {
      if (existingProduct.quantity >= product.stock) {
        toast({
          title: "خطأ",
          description: `الكمية المطلوبة لـ "${product.name}" تتجاوز المخزون المتاح (${product.stock})`,
          variant: "destructive",
        });
        return;
      }
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
      toast({
        title: "تم",
        description: `تم زيادة كمية "${product.name}" في الفاتورة`,
      });
    } else {
      if (product.stock <= 0) {
        toast({
          title: "خطأ",
          description: `المنتج "${product.name}" غير متوفر في المخزون`,
          variant: "destructive",
        });
        return;
      }
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
      toast({
        title: "تم",
        description: `تم إضافة "${product.name}" إلى الفاتورة`,
      });
    }
    setSearchValue("");
    setBarcodeError(null);
  };

  const handleRemoveProduct = (index: number) => {
    const productName = selectedProducts[index].product.name;
    const newProducts = [...selectedProducts];
    newProducts.splice(index, 1);
    setSelectedProducts(newProducts);
    toast({
      title: "تم",
      description: `تم إزالة "${productName}" من الفاتورة`,
    });
  };

  const handleClearProducts = () => {
    setSelectedProducts([]);
    toast({
      title: "تم",
      description: "تم مسح جميع المنتجات المختارة",
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    if (isNaN(quantity) || quantity < 1) {
      toast({
        title: "خطأ",
        description: "الكمية يجب أن تكون أكبر من 0",
        variant: "destructive",
      });
      return;
    }
    const product = selectedProducts[index].product;
    if (quantity > product.stock) {
      toast({
        title: "خطأ",
        description: `الكمية المطلوبة لـ "${product.name}" تتجاوز المخزون المتاح (${product.stock})`,
        variant: "destructive",
      });
      return;
    }
    const newProducts = [...selectedProducts];
    newProducts[index].quantity = quantity;
    setSelectedProducts(newProducts);
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^01[0-2,5]\d{8}$/;
    return phone === "" || phoneRegex.test(phone);
  };

  const handleBarcodeSubmit = () => {
    if (!searchValue) return;
    const cleanedBarcode = searchValue.trim();
    console.log("Searching for barcode:", cleanedBarcode);
    const matchedProduct = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === cleanedBarcode.toLowerCase()
    );
    if (matchedProduct) {
      console.log("Found product:", matchedProduct);
      handleAddProduct({
        value: matchedProduct.id,
        label: `${matchedProduct.name} (السعر: ${matchedProduct.sale_price} ج.م | المخزون: ${matchedProduct.stock})`,
        product: matchedProduct,
      });
    } else {
      console.log("No product found for barcode:", cleanedBarcode);
      setBarcodeError(`لم يتم العثور على منتج بالباركود "${cleanedBarcode}"`);
      setHasPreviousError(true);
      setLastFailedBarcode(cleanedBarcode);
      setRetryCount((prev) => prev + 1);
      setNewProductFormData({ ...newProductFormData, barcode: cleanedBarcode });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isBarcodeMode && searchValue && !hasPreviousError) {
      handleBarcodeSubmit();
    }
  };

  useEffect(() => {
    if (searchValue && searchValue !== lastFailedBarcode) {
      setHasPreviousError(false);
      setLastFailedBarcode(null);
      setRetryCount(0);
      setBarcodeError(null);
    }
  }, [searchValue, lastFailedBarcode]);

  useEffect(() => {
    if (barcodeError) {
      setHasPreviousError(true);
      setLastFailedBarcode(searchValue);
      setRetryCount((prev) => prev + 1);
    }
  }, [barcodeError, searchValue]);

  useEffect(() => {
    if (
      isBarcodeMode &&
      autoMode &&
      searchValue.length === AUTO_SUBMIT_LENGTH &&
      !hasPreviousError &&
      searchValue !== lastFailedBarcode &&
      retryCount < 3
    ) {
      const timer = setTimeout(() => {
        handleBarcodeSubmit();
      }, 50);
      return () => clearTimeout(timer);
    } else if (retryCount >= 3) {
      setBarcodeError("تم الوصول إلى الحد الأقصى للمحاولات. يرجى إدخال باركود جديد.");
    }
  }, [searchValue, autoMode, hasPreviousError, lastFailedBarcode, retryCount]);

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newProductFormData.name ||
      !newProductFormData.barcode ||
      !newProductFormData.sale_price ||
      !newProductFormData.purchase_price ||
      !newProductFormData.category_id
    ) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        name: newProductFormData.name.trim(),
        description: newProductFormData.description.trim(),
        barcode: newProductFormData.barcode.trim(),
        sale_price: parseFloat(newProductFormData.sale_price),
        purchase_price: parseFloat(newProductFormData.purchase_price),
        stock: parseInt(newProductFormData.stock) || 0,
        min_stock: parseInt(newProductFormData.min_stock) || 0,
        category_id: newProductFormData.category_id,
      };

      const response = await api.post("/api/products", productData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json",
        },
      });

      const newProduct = {
        ...response.data,
        sale_price: parseFloat(response.data.sale_price),
        stock: parseInt(response.data.stock) || 0,
        category: categories.find((c) => c.id === response.data.category_id),
      };

      handleAddProduct({
        value: newProduct.id,
        label: `${newProduct.name} (السعر: ${newProduct.sale_price} ج.م | المخزون: ${newProduct.stock})`,
        product: newProduct,
      });

      toast({
        title: "تم إضافة المنتج",
        description: `تم إضافة ${newProduct.name} بنجاح`,
      });

      setIsAddProductDialogOpen(false);
      setNewProductFormData({
        name: "",
        description: "",
        sale_price: "",
        purchase_price: "",
        stock: "",
        min_stock: "",
        barcode: "",
        category_id: "",
      });
      setSearchValue("");
      setBarcodeError(null);
      setHasPreviousError(false);
      setLastFailedBarcode(null);
      setRetryCount(0);
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل إضافة المنتج",
        variant: "destructive",
      });
    }
  };

  const handleAddNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCustomerFormData.name) {
      toast({
        title: "خطأ في البيانات",
        description: "اسم العميل مطلوب",
        variant: "destructive",
      });
      return;
    }

    if (newCustomerFormData.phone && !validatePhoneNumber(newCustomerFormData.phone)) {
      toast({
        title: "خطأ",
        description: "رقم الهاتف غير صالح. يجب أن يكون 11 رقمًا ويبدأ بـ 01",
        variant: "destructive",
      });
      return;
    }

    if (newCustomerFormData.phone && customers.some((c) => c.phone === newCustomerFormData.phone)) {
      toast({
        title: "خطأ",
        description: "رقم الهاتف موجود بالفعل لعميل آخر",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerData = {
        name: newCustomerFormData.name.trim(),
        phone: newCustomerFormData.phone.trim() || null,
        email: newCustomerFormData.email.trim() || null,
        address: newCustomerFormData.address.trim() || null,
        notes: newCustomerFormData.notes.trim() || null,
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
      setPhone(newCustomer.phone || "");
      setSelectedCustomerOption({
        value: newCustomer.id,
        label: `${newCustomer.name}${newCustomer.phone ? ` (${newCustomer.phone})` : ''}`,
        customer: newCustomer,
      });
      setIsAddCustomerDialogOpen(false);
      setNewCustomerFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
      });

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
      setSelectedCustomerOption(null);
      setCustomerName("");
      setPhone("");
      setInputSearch("");
      return;
    }

    if (option) {
      setSelectedCustomerOption(option);
      setCustomerName(option.customer.name);
      setPhone(option.customer.phone || "");
      setInputSearch("");
    }
  };

  const handleCustomerInputChange = (inputValue: string, actionMeta: InputActionMeta) => {
    if (actionMeta.action === "input-change") {
      setInputSearch(inputValue);
      setCustomerName(inputValue);
      fetchCustomers(inputValue);
      // تمت إزالة أي تأثير على حقل الهاتف للسماح بالتعديل اليدوي
    }
  };

  const handleSubmit = () => {
    if (phone && !validatePhoneNumber(phone)) {
      setErrors({ phone: "رقم الهاتف غير صالح. يجب أن يكون 11 رقمًا ويبدأ بـ 01" });
      return;
    }
    if (selectedProducts.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب اختيار منتج واحد على الأقل لإنشاء الفاتورة",
        variant: "destructive",
      });
      return;
    }
    setErrors({});
    const selectedCustomer = customers.find((c) => c.name === customerName);
    onCreateInvoice(customerName || "عميل فوري", phone, notes, selectedCustomer?.id);
  };

  const handleClose = () => {
    onOpenChange(false);
    setCustomerName("");
    setPhone("");
    setNotes("");
    setSelectedProducts([]);
    setSearchValue("");
    setErrors({});
    setBarcodeError(null);
    setHasPreviousError(false);
    setLastFailedBarcode(null);
    setRetryCount(0);
    setIsAddCustomerDialogOpen(false);
    setSelectedCustomerOption(null);
    setInputSearch("");
    setNewCustomerFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-slate-700 rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            إنشاء فاتورة جديدة
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            قم بملء تفاصيل الفاتورة وإضافة المنتجات باستخدام البحث أو الباركود
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                <div className="flex justify-between items-center">
                  <div>اسم العميل</div>
                  <div>
                    {customerName && !customers.some((c) => c.name === customerName) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewCustomerFormData({ ...newCustomerFormData, name: customerName, phone });
                          setIsAddCustomerDialogOpen(true);
                        }}
                        className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 text-white border-none hover:from-blue-600 hover:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        إضافة عميل جديد
                      </Button>
                    )}
                  </div>
                </div>
              </Label>
              <div className="relative group">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <User className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                        <Select
                          options={customerOptions}
                          value={selectedCustomerOption}
                          onChange={handleCustomerSelect}
                          onInputChange={handleCustomerInputChange}
                          inputValue={inputSearch}
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
                              color: "#1f2937 !important",
                              ".dark &": {
                                backgroundColor: "#1e293b",
                                borderColor: "#334155",
                                color: "#f8fafc !important",
                              },
                            }),
                            option: (base, { isFocused, isSelected }) => ({
                              ...base,
                              backgroundColor: isSelected
                                ? "#3b82f6"
                                : isFocused
                                ? "#eff6ff"
                                : "#ffffff",
                              color: isSelected ? "#ffffff !important" : "#1f2937 !important",
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
                                color: isSelected ? "#ffffff !important" : "#f8fafc !important",
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
                              color: "#1f2937 !important",
                              fontSize: "0.875rem",
                              ".dark &": {
                                color: "#f8fafc !important",
                              },
                            }),
                            input: (base) => ({
                              ...base,
                              textAlign: "right",
                              color: "#1f2937 !important",
                              fontSize: "0.875rem",
                              ".dark &": {
                                color: "#f8fafc !important",
                              },
                            }),
                            placeholder: (base) => ({
                              ...base,
                              color: "#9ca3af !important",
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
                      <p>{customerName || "ابحث عن العميل أو أدخل اسمًا جديدًا"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                رقم الهاتف
              </Label>
              <div className="relative group">
                <Phone className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    const newPhone = e.target.value;
                    setPhone(newPhone);
                    setErrors((prev) => ({ ...prev, phone: "" }));
                    if (selectedCustomerOption && newPhone !== selectedCustomerOption.customer.phone) {
                      updateCustomerPhone(selectedCustomerOption.customer.id, newPhone);
                    }
                  }}
                  placeholder="01xxxxxxxxx"
                  className={`pr-10 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200 ${
                    errors.phone ? "border-red-500 dark:border-red-500 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900" : ""
                  }`}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                ملاحظات
              </Label>
              <div className="relative group">
                <FileText className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل ملاحظات (اختياري)"
                  className="pr-10 pl-3 py-2 h-10 text-sm border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold text-gray-800 dark:text-gray-200">إضافة منتجات</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  {isBarcodeMode ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {autoMode ? (
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                              <Zap className="w-5 h-5" />
                              <span className="font-medium">الوضع التلقائي</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                              <Hand className="w-5 h-5" />
                              <span className="font-medium">الوضع اليدوي</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${autoMode ? "text-green-600 dark:text-green-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>تلقائي</span>
                          <Switch
                            dir="ltr"
                            checked={autoMode}
                            onCheckedChange={setAutoMode}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-blue-500 dark:data-[state=checked]:bg-green-600 dark:data-[state=unchecked]:bg-blue-600"
                          />
                          <span className={`text-sm ${!autoMode ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400"}`}>يدوي</span>
                        </div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative">
                              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                              <Input
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder={autoMode ? "امسح الباركود للإضافة التلقائية..." : "أدخل الباركود واضغط إدخال..."}
                                className="pr-10 pl-3 py-2 h-10 text-sm font-mono border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-lg shadow-sm dark:bg-slate-700 dark:text-gray-200 text-center"
                                disabled={isLoading || retryCount >= 3}
                                autoFocus
                              />
                              <div className="absolute top-2 left-3 text-gray-400 dark:text-gray-500 text-sm">
                                {searchValue.length}/{AUTO_SUBMIT_LENGTH}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                            <p>{autoMode ? "امسح الباركود للإضافة تلقائيًا" : "أدخل الباركود واضغط Enter للإضافة"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {barcodeError && (
                        <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 flex items-start gap-2 text-red-700 dark:text-red-200">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{barcodeError}</span>
                          <Can action="create" subject="Product">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddProductDialogOpen(true)}
                              className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 text-white border-none hover:from-blue-600 hover:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              إضافة منتج جديد
                            </Button>
                          </Can>
                        </div>
                      )}
                      {(hasPreviousError || retryCount >= 3) && (
                        <div className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 justify-center">
                          <AlertCircle className="w-3 h-3" />
                          <span>{retryCount >= 3 ? "تم الوصول إلى الحد الأقصى للمحاولات. يرجى إدخال باركود جديد." : "حدث خطأ في الباركود السابق. يرجى إدخال باركود جديد."}</span>
                        </div>
                      )}
                      {!autoMode && (
                        <Button
                          onClick={handleBarcodeSubmit}
                          className="mt-2 w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-300 hover:scale-[1.02] dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 shadow-lg text-white font-semibold rounded-lg"
                          disabled={isLoading || searchValue.length < 1 || hasPreviousError || retryCount >= 3}
                        >
                          إضافة المنتج
                        </Button>
                      )}
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                            <Select
                              options={productOptions}
                              value={searchValue ? { value: "", label: searchValue, product: {} as Product } : null}
                              onChange={handleAddProduct}
                              onInputChange={(input) => setSearchValue(input.trim())}
                              inputValue={searchValue}
                              placeholder="ابحث باسم المنتج..."
                              isClearable
                              noOptionsMessage={() => "لا توجد منتجات مطابقة"}
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
                                  {option.product.stock <= 0 && (
                                    <span className="text-red-500 dark:text-red-400 text-xs font-medium bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full">غير متوفر</span>
                                  )}
                                </div>
                              )}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                          <p>ابحث باسم المنتج واختر من القائمة</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div className="d-block">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isBarcodeMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setIsBarcodeMode(!isBarcodeMode);
                          setSearchValue("");
                          setBarcodeError(null);
                          setHasPreviousError(false);
                          setLastFailedBarcode(null);
                          setRetryCount(0);
                        }}
                        className={`h-8 px-3 text-sm ${isBarcodeMode ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800" : "border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                      >
                        {isBarcodeMode ? <Search className="w-4 h-4 mr-1" /> : <Barcode className="w-4 h-4 mr-1" />}
                        {isBarcodeMode ? "البحث بالاسم" : "البحث بالباركود"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                      <p>{isBarcodeMode ? "التبديل إلى البحث باسم المنتج" : "التبديل إلى البحث بالباركود"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">المنتجات المختارة</h4>
                {selectedProducts.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearProducts}
                          className="h-8 px-3 text-sm text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <X className="w-4 h-4 mr-1" />
                          مسح الكل
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                        <p>إزالة جميع المنتجات المختارة</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="border rounded-lg shadow-sm overflow-hidden dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700">
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">المنتج</TableHead>
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الباركود</TableHead>
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">السعر</TableHead>
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الكمية</TableHead>
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">الإجمالي</TableHead>
                      <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                          لم يتم اختيار أي منتجات بعد
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedProducts.map((sp, index) => (
                        <TableRow key={sp.product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <TableCell className="text-center font-medium text-gray-800 dark:text-gray-200">{sp.product.name}</TableCell>
                          <TableCell className="text-center text-gray-600 dark:text-gray-400">{sp.product.barcode || 'غير متوفر'}</TableCell>
                          <TableCell className="text-center text-gray-800 dark:text-gray-200">{Number(sp.product.sale_price).toFixed(2)} ج.م</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              max={sp.product.stock}
                              value={sp.quantity}
                              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                              className="w-20 h-8 text-center m-auto border-gray-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 rounded-md dark:bg-slate-700 dark:text-gray-200"
                            />
                            {sp.quantity > sp.product.stock && (
                              <p className="text-center text-red-500 dark:text-red-400 mt-1">الكمية تتجاوز المخزون المتاح</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-gray-800 dark:text-gray-200">{(sp.quantity * sp.product.sale_price).toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-center align-middle">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveProduct(index)}
                                    className="h-8 w-8 rounded-md"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200">
                                  <p>إزالة "{sp.product.name}" من الفاتورة</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-center text-base font-bold text-blue-900 dark:text-blue-300 mt-3">
                المجموع: {selectedProducts
                  .reduce((sum, sp) => sum + sp.quantity * sp.product.sale_price, 0)
                  .toFixed(2)} ج.م
              </div>
            </div>
          </div>
          <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
            <DialogContent className="sm:max-w-4xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="dark:text-gray-200">إضافة عميل جديد</DialogTitle>
                <DialogDescription className="dark:text-gray-400">املأ البيانات لإضافة عميل جديد</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddNewCustomer} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer_name" className="text-right dark:text-gray-300">
                      اسم العميل *
                    </Label>
                    <Input
                      id="customer_name"
                      value={newCustomerFormData.name}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, name: e.target.value })
                      }
                      placeholder="أدخل اسم العميل"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer_phone" className="text-right dark:text-gray-300">
                      رقم الهاتف
                    </Label>
                    <Input
                      id="customer_phone"
                      value={newCustomerFormData.phone}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, phone: e.target.value })
                      }
                      placeholder="01xxxxxxxxx"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer_email" className="text-right dark:text-gray-300">
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={newCustomerFormData.email}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, email: e.target.value })
                      }
                      placeholder="أدخل البريد الإلكتروني"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="customer_address" className="text-right dark:text-gray-300">
                      العنوان
                    </Label>
                    <Input
                      id="customer_address"
                      value={newCustomerFormData.address}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, address: e.target.value })
                      }
                      placeholder="أدخل العنوان"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="customer_notes" className="text-right dark:text-gray-300">
                      ملاحظات
                    </Label>
                    <Textarea
                      id="customer_notes"
                      value={newCustomerFormData.notes}
                      onChange={(e) =>
                        setNewCustomerFormData({ ...newCustomerFormData, notes: e.target.value })
                      }
                      placeholder="أدخل ملاحظات"
                      rows={4}
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4 justify-end">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 dark:text-gray-200"
                  >
                    إضافة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    onClick={() => {
                      setIsAddCustomerDialogOpen(false);
                      setNewCustomerFormData({
                        name: "",
                        phone: "",
                        email: "",
                        address: "",
                        notes: "",
                      });
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
            <DialogContent className="sm:max-w-4xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="dark:text-gray-200">إضافة منتج جديد</DialogTitle>
                <DialogDescription className="dark:text-gray-400">املأ البيانات لإضافة منتج جديد</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddNewProduct} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name" className="text-right dark:text-gray-300">
                      اسم المنتج *
                    </Label>
                    <Input
                      id="name"
                      value={newProductFormData.name}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, name: e.target.value })
                      }
                      placeholder="أدخل اسم المنتج"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="sale_price" className="text-right dark:text-gray-300">
                      سعر البيع *
                    </Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      value={newProductFormData.sale_price}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, sale_price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="purchase_price" className="text-right dark:text-gray-300">
                      سعر الشراء *
                    </Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={newProductFormData.purchase_price}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, purchase_price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="stock" className="text-right dark:text-gray-300">
                      الكمية المتوفرة
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={newProductFormData.stock}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, stock: e.target.value })
                      }
                      placeholder="0"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="min_stock" className="text-right dark:text-gray-300">
                      الحد الأدنى للمخزون
                    </Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={newProductFormData.min_stock}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, min_stock: e.target.value })
                      }
                      placeholder="0"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="barcode" className="text-right dark:text-gray-300">
                      الباركود *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        value={newProductFormData.barcode}
                        onChange={(e) =>
                          setNewProductFormData({ ...newProductFormData, barcode: e.target.value })
                        }
                        placeholder="الباركود"
                        className="flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                        onClick={() =>
                          setNewProductFormData({
                            ...newProductFormData,
                            barcode: Math.floor(Math.random() * 1000000000).toString(),
                          })
                        }
                      >
                        <Barcode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="category" className="text-right dark:text-gray-300">
                      الفئة *
                    </Label>
                    <Select<CategoryOption>
                      options={categoryOptions}
                      value={selectedCategory}
                      onChange={(selectedOption: SingleValue<CategoryOption>) => {
                        if (selectedOption) {
                          setNewProductFormData({
                            ...newProductFormData,
                            category_id: selectedOption.value,
                          });
                        }
                      }}
                      placeholder="اختر الفئة..."
                      isSearchable
                      isClearable
                      noOptionsMessage={() => "لا توجد فئات متاحة"}
                      className="text-right"
                      classNamePrefix="select"
                      styles={{
                        control: (base, { isFocused }) => ({
                          ...base,
                          padding: "0.5rem",
                          borderColor: isFocused ? "#3b82f6" : "#e5e7eb",
                          "&:hover": { borderColor: "#9ca3af" },
                          minHeight: "40px",
                          backgroundColor: "#fff",
                          "@media (prefers-color-scheme: dark)": {
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                            color: "#f8fafc",
                          },
                        }),
                        option: (base, { isFocused, isSelected }) => ({
                          ...base,
                          backgroundColor: isSelected ? "#3b82f6" : isFocused ? "#eff6ff" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#1f2937",
                          textAlign: "right",
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          "@media (prefers-color-scheme: dark)": {
                            backgroundColor: isSelected ? "#3b82f6" : isFocused ? "#1e40af" : "#1e293b",
                            color: isSelected ? "#ffffff" : "#f8fafc",
                          },
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                          backgroundColor: "#fff",
                          "@media (prefers-color-scheme: dark)": {
                            backgroundColor: "#1e293b",
                            borderColor: "#334155",
                          },
                        }),
                        singleValue: (base) => ({
                          ...base,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#1f2937",
                          "@media (prefers-color-scheme: dark)": {
                            color: "#f8fafc",
                          },
                        }),
                        input: (base) => ({
                          ...base,
                          textAlign: "right",
                          color: "#1f2937",
                          "@media (prefers-color-scheme: dark)": {
                            color: "#f8fafc",
                          },
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: "#9ca3af",
                        }),
                      }}
                      formatOptionLabel={(option) => (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: option.color }}
                          />
                          <span className="truncate">{option.label}</span>
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
                    <Label htmlFor="description" className="text-right dark:text-gray-300">
                      الوصف
                    </Label>
                    <Textarea
                      id="description"
                      value={newProductFormData.description}
                      onChange={(e) =>
                        setNewProductFormData({ ...newProductFormData, description: e.target.value })
                      }
                      placeholder="أدخل وصف المنتج"
                      rows={4}
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4 justify-end">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 dark:text-gray-200"
                  >
                    إضافة
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    onClick={() => {
                      setIsAddProductDialogOpen(false);
                      setNewProductFormData({
                        name: "",
                        description: "",
                        sale_price: "",
                        purchase_price: "",
                        stock: "",
                        min_stock: "",
                        barcode: "",
                        category_id: "",
                      });
                      setSearchValue("");
                      setBarcodeError(null);
                    }}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <DialogFooter className="gap-2 sm:gap-3 sm:justify-start pt-4 border-t border-gray-200 dark:border-slate-700">
          <Button
            onClick={handleSubmit}
            disabled={selectedProducts.length === 0 || isLoading || !!errors.phone}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-sm text-white font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                جاري الحفظ...
              </div>
            ) : (
              "حفظ الفاتورة"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClose}
            className="text-sm border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm transition-all duration-300"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewInvoiceDialog;