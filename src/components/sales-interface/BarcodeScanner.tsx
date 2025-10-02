import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Barcode, RotateCcw, AlertCircle, Info, Zap, Hand, X, Plus } from "lucide-react";
import Select, { SingleValue } from "react-select";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { Can } from '@/components/Can';

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  sale_price: number;
  barcode: string;
  stock: number;
  category?: {
    name: string;
    color: string;
  };
}

interface BarcodeScannerProps {
  barcode: string;
  setBarcode: (value: string) => void;
  handleBarcodeSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  showHistory: boolean;
  lastInvoiceInfo: string | null;
  errorMessage: string | null;
  setErrorMessage: (value: string | null) => void;
  autoSubmitOnLength?: number;
  categories: Category[];
  onProductAdded: (product: Product) => void;
}

const BarcodeScanner = ({
  barcode,
  setBarcode,
  handleBarcodeSubmit,
  isLoading,
  showHistory,
  lastInvoiceInfo,
  errorMessage,
  setErrorMessage,
  autoSubmitOnLength = 13,
  categories,
  onProductAdded,
}: BarcodeScannerProps) => {
  const [autoMode, setAutoMode] = useState(autoSubmitOnLength ? true : false);
  const [showTips, setShowTips] = useState(false);
  const [showScannerInfo, setShowScannerInfo] = useState(false);
  const [hasPreviousError, setHasPreviousError] = useState(false);
  const [lastFailedBarcode, setLastFailedBarcode] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
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

  const { toast } = useToast();

  // خيارات الفئات لـ Select
  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color || "#6B7280",
  }));

  const selectedCategory = categoryOptions.find(
    (option) => option.value === newProductFormData.category_id
  );

  // إعادة تعيين حالة الخطأ عند إدخال باركود جديد
  useEffect(() => {
    if (barcode && barcode !== lastFailedBarcode) {
      setHasPreviousError(false);
      setLastFailedBarcode(null);
      setRetryCount(0);
      setErrorMessage(null);
    }
  }, [barcode, lastFailedBarcode, setErrorMessage]);

  // تتبع حالة الخطأ
  useEffect(() => {
    if (errorMessage) {
      setHasPreviousError(true);
      setLastFailedBarcode(barcode);
      setRetryCount((prev) => prev + 1);
      setNewProductFormData({ ...newProductFormData, barcode });
    }
  }, [errorMessage, barcode]);

  // التحقق من الإرسال التلقائي
  useEffect(() => {
    if (
      autoMode &&
      barcode.length === autoSubmitOnLength &&
      !hasPreviousError &&
      barcode !== lastFailedBarcode &&
      retryCount < 3
    ) {
      const timer = setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleBarcodeSubmit(fakeEvent);
      }, 50);
      return () => clearTimeout(timer);
    } else if (retryCount >= 3) {
      setErrorMessage("تم الوصول إلى الحد الأقصى للمحاولات. يرجى إدخال باركود جديد.");
    }
  }, [barcode, autoSubmitOnLength, handleBarcodeSubmit, autoMode, hasPreviousError, lastFailedBarcode, retryCount, setErrorMessage]);

  // معالجة إضافة منتج جديد
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
        purchase_price: parseFloat(response.data.purchase_price),
        stock: parseInt(response.data.stock) || 0,
        category: categories.find((c) => c.id === response.data.category_id),
      };

      onProductAdded(newProduct);
      toast({
        title: "تم إضافة المنتج",
        description: `تم إضافة ${newProduct.name} بنجاح`,
      });

      // إغلاق النافذة وإعادة تعيين البيانات
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
      setBarcode("");
      setErrorMessage(null);
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "خطأ",
        description: error.response?.data?.message || "فشل إضافة المنتج",
        variant: "destructive",
      });
    }
  };

return (
    <Card
      className={`bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border-2 ${
        showHistory 
          ? "border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20"
          : "border-blue-100 dark:border-blue-700 shadow-blue-100 dark:shadow-blue-900/20"
      } transition-all duration-300 relative overflow-hidden mt-0 pt-0`}
    >
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full -m-6 ${
          showHistory 
            ? "bg-red-200/30 dark:bg-red-800/30" 
            : "bg-blue-200/30 dark:bg-blue-800/30"
        }`}
      ></div>
      <div
        className={`absolute bottom-0 left-0 w-16 h-16 rounded-full -m-4 ${
          showHistory 
            ? "bg-red-100/40 dark:bg-red-900/40" 
            : "bg-blue-100/40 dark:bg-blue-900/40"
        }`}
      ></div>

      <CardHeader>
        <CardTitle
          className={`flex items-center gap-2 ${
            showHistory 
              ? "text-red-800 dark:text-red-300" 
              : "text-blue-800 dark:text-blue-300"
          }`}
        >
          <Barcode className="w-6 h-6" />
          {showHistory ? "استرجاع بالباركود" : "قارئ الباركود"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {autoMode ? (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Zap className="w-5 h-5" />
                <span className="font-medium">
                  الوضع التلقائي (باركود)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Hand className="w-5 h-5" />
                <span className="font-medium">الوضع اليدوي (إدخال باليد)</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                autoMode 
                  ? "text-green-600 dark:text-green-400 font-medium" 
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              تلقائي
            </span>
            <Switch
              dir="ltr"
              checked={autoMode}
              onCheckedChange={setAutoMode}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-blue-500 dark:data-[state=checked]:bg-green-600 dark:data-[state=unchecked]:bg-blue-600"
            />
            <span
              className={`text-sm ${
                !autoMode 
                  ? "text-blue-600 dark:text-blue-400 font-medium" 
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              يدوي
            </span>
          </div>
        </div>
 
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 flex items-start gap-2 text-red-700 dark:text-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
            <Can action="create" subject="Product" >np
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddProductDialogOpen(true)}
                  className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 text-white border-none hover:from-blue-600 hover:to-purple-600 dark:hover:from-blue-700 dark:hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2 " />
                  إضافة منتج جديد
                </Button>
            </Can>
          </div>
        )}

        {lastInvoiceInfo && !errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 flex items-start gap-2 text-blue-700 dark:text-blue-200">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{lastInvoiceInfo}</span>
          </div>
        )}

        <form onSubmit={handleBarcodeSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={
                autoMode
                  ? showHistory
                    ? "امسح الباركود لاسترجاع اخر منتج تم اضافته..."
                    : "امسح الباركود للإضافة التلقائية..."
                  : showHistory
                  ? "ادخل الباركود لاسترجاع اخر منتج تم اضافته..."
                  : "امسح الباركود واضغط إدخال..."
              }
              className="flex-1 text-center font-mono text-lg h-14 border-2 shadow-md rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
              autoFocus
              disabled={isLoading || retryCount >= 3}
              dir="rtl"
            />
            <div className="absolute top-3 right-3 text-gray-400 dark:text-gray-500 text-sm">
              {barcode.length}/{autoSubmitOnLength}
            </div>
          </div>

          {hasPreviousError && (
            <div className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 justify-center">
              <AlertCircle className="w-3 h-3" />
              <span>حدث خطأ في الباركود السابق. يرجى إدخال باركود جديد.</span>
            </div>
          )}

          {retryCount >= 3 && (
            <div className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 justify-center">
              <AlertCircle className="w-3 h-3" />
              <span>تم الوصول إلى الحد الأقصى للمحاولات. يرجى إدخال باركود جديد أو تحويل إلى الوضع اليدوي.</span>
            </div>
          )}

          {!autoMode && (
            <Button
              type="submit"
              className={`h-12 text-lg font-bold transition-transform rounded-xl ${
                showHistory
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-300 hover:scale-[1.02] dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-300 hover:scale-[1.02] dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800"
              } shadow-lg dark:text-gray-200`}
              disabled={isLoading || barcode.length < 1 || hasPreviousError || retryCount >= 3}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {showHistory
                    ? "جاري البحث عن أحدث فاتورة..."
                    : "جاري إضافة المنتج..."}
                </div>
              ) : showHistory ? (
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  استرجاع من أحدث فاتورة
                </div>
              ) : (
                "إضافة المنتج إلى السلة"
              )}
            </Button>
          )}
        </form>

        {showTips && (
          <div className="mt-4 text-xs rounded-lg border transition-all duration-300 overflow-hidden dark:border-slate-700">
            <div
              className="flex items-center justify-between p-2 cursor-pointer bg-gray-50 dark:bg-slate-700"
              onClick={() => setShowTips(false)}
            >
              <div className="flex items-center gap-2">
                {autoMode ? (
                  <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                    <Zap className="w-4 h-4" />
                    <span>تلميح الاستخدام</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                    <Hand className="w-4 h-4" />
                    <span>تلميح الاستخدام</span>
                  </div>
                )}
              </div>
              <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className={`p-2 text-center ${
                autoMode
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              }`}
            >
              {autoMode ? (
                <span>
                  الوضع التلقائي مفعل: سيتم الإضافة تلقائياً عند مسح باركود كامل
                  ({autoSubmitOnLength} رقم)
                </span>
              ) : showHistory ? (
                <span>
                  الوضع اليدوي: اضغط على زر "استرجاع من أحدث فاتورة" بعد إدخال
                  الباركود
                </span>
              ) : (
                <span>
                  الوضع اليدوي: اضغط على زر "إضافة المنتج إلى السلة" بعد إدخال
                  الباركود
                </span>
              )}
            </div>
          </div>
        )}

        {showScannerInfo && (
          <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-700 text-xs text-gray-600 dark:text-gray-400 overflow-hidden transition-all duration-300">
            <div
              className="flex items-center justify-between p-2 cursor-pointer bg-gray-50 dark:bg-slate-700"
              onClick={() => setShowScannerInfo(false)}
            >
              <div className="flex items-center gap-2 font-medium">
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>معلومات عن وضع الإدخال</span>
              </div>
              <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-gray-50 dark:bg-slate-700">
              <div className="mt-1">
                {autoMode
                  ? "الوضع التلقائي مناسب للمسدسات المدمجة التي لا ترسل مفتاح Enter. سيتم الإضافة تلقائيًا عند اكتمال الباركود."
                  : "الوضع اليدوي مناسب للإدخال باليد أو عندما تحتاج للتحقق قبل الإضافة. اضغط على زر الإدخال بعد إدخال الباركود."}
              </div>
              {autoMode && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span className="font-medium">تلميح:</span>
                  </div>
                  <div className="mt-1">
                    تأكد من أن مسدس الباركود مضبوط على إرسال الباركود فقط دون
                    إضافة أحرف إضافية مثل Enter أو Tab
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(!showTips || !showScannerInfo) && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {!showTips && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 dark:text-gray-400 dark:hover:bg-slate-700"
                onClick={() => setShowTips(true)}
              >
                <Info className="w-3 h-3 mr-1" /> إظهار التلميحات
              </Button>
            )}
            {!showScannerInfo && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 dark:text-gray-400 dark:hover:bg-slate-700"
                onClick={() => setShowScannerInfo(true)}
              >
                <Info className="w-3 h-3 mr-1" /> إظهار إعدادات الماسح
              </Button>
            )}
          </div>
        )}

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
                      setNewProductFormData({
                        ...newProductFormData,
                        purchase_price: e.target.value,
                      })
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
                        borderColorDefault: "#334155",
                        "&:hover": {
                          borderColor: "#9ca3af",
                        },
                        minHeight: "40px",
                        backgroundColor: "#1e293b",
                        // borderColor: "#334155",
                        color: "#f8fafc",
                      }),
                      option: (base, { isFocused, isSelected }) => ({
                        ...base,
                        backgroundColor: isSelected
                          ? "#3b82f6"
                          : isFocused
                          ? "#1e40af"
                          : "#1e293b",
                        color: isSelected ? "#ffffff" : "#f8fafc",
                        textAlign: "right",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                      }),
                      singleValue: (base) => ({
                        ...base,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#f8fafc",
                      }),
                      input: (base) => ({
                        ...base,
                        textAlign: "right",
                        color: "#f8fafc",
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
                      setNewProductFormData({
                        ...newProductFormData,
                        description: e.target.value,
                      })
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
                    setBarcode("");
                    setErrorMessage(null);
                  }}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;