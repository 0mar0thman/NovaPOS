import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Package, Plus, Search, Edit, Trash2, Barcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryManagement from "./CategoryManagement";
import api from "@/lib/axios";
import Select, { SingleValue } from "react-select";
import { Can } from "@/components/Can";
import CameraBarcodeScanner from "./CameraBarcodeScanner";

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sale_price: number | string;
  purchase_price: number | string;
  stock: number;
  min_stock: number;
  barcode?: string;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

interface CategoryOption {
  value: string;
  label: string;
  color: string;
}

const ProductManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sale_price: "",
    purchase_price: "",
    stock: "",
    min_stock: "",
    barcode: "",
    category_id: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [productsPerPage] = useState(16);

  const { toast } = useToast();

  const categoryOptions: CategoryOption[] = categories.map((category) => ({
    value: category.id,
    label: category.name,
    color: category.color || "#6B7280",
  }));

  const selectedCategory = categoryOptions.find(
    (option) => option.value === formData.category_id
  );

  // Fetch categories and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [categoriesRes, productsRes] = await Promise.all([
          api.get("/api/categories", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }),
          api.get("/api/products", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }),
        ]);

        setCategories(
          Array.isArray(categoriesRes?.data) ? categoriesRes.data : []
        );
        setProducts(
          Array.isArray(productsRes?.data)
            ? productsRes.data.map((p) => ({
                ...p,
                sale_price:
                  typeof p.sale_price === "string"
                    ? parseFloat(p.sale_price)
                    : p.sale_price,
                purchase_price:
                  typeof p.purchase_price === "string"
                    ? parseFloat(p.purchase_price)
                    : p.purchase_price,
                min_stock: parseInt(p.min_stock) || 0,
              }))
            : []
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "خطأ",
          description: "فشل تحميل البيانات من السيرفر",
          variant: "destructive",
        });
        setCategories([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // معالجة الباركود الممسوح من الكاميرا
  const handleBarcodeScanned = (barcode: string) => {
    setFormData((prev) => ({ ...prev, barcode }));
    toast({
      title: "تم إضافة الباركود",
      description: `تم مسح الباركود ${barcode} بنجاح`,
    });
  };

  // Pagination logic
  const filteredProducts = products.filter(
    (product) =>
      product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.category?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      product?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredProducts.length / productsPerPage);
  const offset = currentPage * productsPerPage;
  const currentProducts = filteredProducts.slice(
    offset,
    offset + productsPerPage
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 10000000000000).toString();
    setFormData({ ...formData, barcode });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.barcode ||
      !formData.sale_price ||
      !formData.purchase_price ||
      !formData.category_id
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
        name: formData.name.trim(),
        description: formData.description.trim(),
        barcode: formData.barcode.trim(),
        sale_price: parseFloat(formData.sale_price),
        purchase_price: parseFloat(formData.purchase_price),
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 0,
        category_id: formData.category_id,
      };

      let response;
      if (editingProduct) {
        response = await api.put(
          `/api/products/${editingProduct.id}`,
          productData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        setProducts(
          products.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...response.data,
                  sale_price: parseFloat(response.data.sale_price),
                  purchase_price: parseFloat(response.data.purchase_price),
                  min_stock: parseInt(response.data.min_stock),
                }
              : p
          )
        );
      } else {
        response = await api.post("/api/products", productData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        });
        setProducts([
          ...products,
          {
            ...response.data,
            sale_price: parseFloat(response.data.sale_price),
            purchase_price: parseFloat(response.data.purchase_price),
            min_stock: parseInt(response.data.min_stock),
          },
        ]);
      }

      toast({
        title: editingProduct ? "تم تحديث المنتج" : "تم إضافة المنتج",
        description: `تم ${editingProduct ? "تحديث" : "إضافة"} ${
          response.data.name
        } بنجاح`,
      });

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        sale_price: "",
        purchase_price: "",
        stock: "",
        min_stock: "",
        barcode: "",
        category_id: "",
      });
      setCurrentPage(0);
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "خطأ",
        description: "فشل حفظ المنتج",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      sale_price:
        typeof product.sale_price === "number"
          ? product.sale_price.toString()
          : product.sale_price || "",
      purchase_price:
        typeof product.purchase_price === "number"
          ? product.purchase_price.toString()
          : product.purchase_price || "",
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      barcode: product.barcode || "",
      category_id: product.category_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/products/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      setProducts(products.filter((p) => p.id !== id));
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج بنجاح",
      });

      if (currentProducts.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "خطأ",
        description: "فشل حذف المنتج",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || "#6B7280";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:text-gray-200 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 transition-all duration-300">
        <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-300">
          إدارة المنتجات
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            إجمالي المنتجات: {filteredProducts.length}
          </span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Can action="create" subject="Product">
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 dark:text-gray-200"
                  onClick={() => {
                    setEditingProduct(null);
                    setFormData({
                      name: "",
                      description: "",
                      sale_price: "",
                      purchase_price: "",
                      stock: "",
                      min_stock: "",
                      barcode: "",
                      category_id: "",
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة منتج جديد
                </Button>
              </DialogTrigger>
            </Can>
            <DialogContent
              className="sm:max-w-4xl dark:bg-slate-800 dark:border-slate-700"
              dir="rtl"
            >
              <DialogHeader>
                <DialogTitle className="dark:text-white">
                  {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                </DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  {editingProduct
                    ? "قم بتعديل بيانات المنتج"
                    : "املأ البيانات لإضافة منتج جديد"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* اسم المنتج */}
                  <div className="flex flex-col gap-2 lg:col-span-2">
                    <Label
                      htmlFor="name"
                      className="text-right dark:text-gray-300"
                    >
                      اسم المنتج *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="أدخل اسم المنتج"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  {/* سعر البيع */}
                  <div className="flex flex-col gap-2 lg:col-span-1">
                    <Label
                      htmlFor="sale_price"
                      className="text-right dark:text-gray-300"
                    >
                      سعر البيع *
                    </Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) =>
                        setFormData({ ...formData, sale_price: e.target.value })
                      }
                      placeholder="0.00"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  {/* سعر الشراء */}
                  <div className="flex flex-col gap-2 lg:col-span-1">
                    <Label
                      htmlFor="purchase_price"
                      className="text-right dark:text-gray-300"
                    >
                      سعر الشراء *
                    </Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchase_price: e.target.value,
                        })
                      }
                      placeholder="0.00"
                      required
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  {/* الكمية */}
                  <div className="flex flex-col gap-2 lg:col-span-1">
                    <Label
                      htmlFor="stock"
                      className="text-right dark:text-gray-300"
                    >
                      الكمية المتوفرة
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      disabled
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      placeholder="0"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  {/* الحد الأدنى */}
                  <div className="flex flex-col gap-2 lg:col-span-1">
                    <Label
                      htmlFor="min_stock"
                      className="text-right dark:text-gray-300"
                    >
                      الحد الأدنى للمخزون
                    </Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, min_stock: e.target.value })
                      }
                      placeholder="0"
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>

                  {/* الباركود */}
                  <div className="flex flex-col gap-2 lg:col-span-2">
                    <Label
                      htmlFor="barcode"
                      className="text-right dark:text-gray-300"
                    >
                      الباركود *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData({ ...formData, barcode: e.target.value })
                        }
                        placeholder="الباركود"
                        className="flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        required
                      />
                      <CameraBarcodeScanner
                        onBarcodeScanned={handleBarcodeScanned}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateBarcode}
                        className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        title="إنشاء باركود عشوائي"
                      >
                        <Barcode className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* الفئة */}
                  <div className="flex flex-col gap-2">
                    {" "}
                    <Label
                      htmlFor="category"
                      className="text-right dark:text-gray-300"
                    >
                      {" "}
                      الفئة *{" "}
                    </Label>{" "}
                    <Select<CategoryOption>
                      options={categoryOptions}
                      value={selectedCategory}
                      onChange={(
                        selectedOption: SingleValue<CategoryOption>
                      ) => {
                        if (selectedOption) {
                          setFormData({
                            ...formData,
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
                        control: (base) => ({
                          ...base,
                          padding: "0.5rem",
                          borderColor: "#e5e7eb",
                          "&:hover": { borderColor: "#9ca3af" },
                          minHeight: "40px",
                          backgroundColor: "#1e293b",
                        }),
                        option: (base, { isFocused, isSelected }) => ({
                          ...base,
                          backgroundColor: isSelected
                            ? "#3b82f6"
                            : isFocused
                            ? "#f3f4f6"
                            : "#1e293b",
                          color: isSelected
                            ? "#ffffff"
                            : isFocused
                            ? "#111827"
                            : "#e2e8f0",
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
                        }),
                        singleValue: (base) => ({
                          ...base,
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: "#e2e8f0",
                        }),
                        input: (base) => ({
                          ...base,
                          textAlign: "right",
                          color: "#e2e8f0",
                        }),
                        placeholder: (base) => ({ ...base, color: "#94a3b8" }),
                      }}
                      formatOptionLabel={(option) => (
                        <div className="flex items-center gap-2">
                          {" "}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: option.color }}
                          />{" "}
                          <span className="truncate">{option.label}</span>{" "}
                        </div>
                      )}
                    />{" "}
                  </div>

                  {/* الوصف */}
                  <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
                    <Label
                      htmlFor="description"
                      className="text-right dark:text-gray-300"
                    >
                      الوصف
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="أدخل وصف المنتج"
                      rows={4}
                      className="w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4 justify-end">
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-500 dark:text-gray-200"
                  >
                    {editingProduct ? "تحديث" : "إضافة"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CategoryManagement
        categories={categories}
        onCategoriesUpdate={setCategories}
      />

      <Card className="bg-white/60 backdrop-blur-sm border-blue-100 dark:bg-slate-800/60 dark:border-slate-700 transition-all duration-300">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن المنتجات..."
              className="pr-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {currentProducts.map((product) => (
          <Card
            key={product.id}
            className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-200 dark:bg-slate-800/80 dark:border-slate-700 dark:hover:shadow-slate-700/30"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
                  {product.name}
                </CardTitle>
                {product.category && (
                  <Badge
                    variant="secondary"
                    className="text-xs text-white border-0"
                    style={{
                      backgroundColor: product.category.color || "#6B7280",
                    }}
                  >
                    {product.category.name}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    الوصف:
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-300 max-w-[60%] truncate">
                    {product.description}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  سعر البيع:
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {typeof product.sale_price === "number"
                    ? product.sale_price.toFixed(2)
                    : Number(product.sale_price || 0).toFixed(2)}{" "}
                  ج.م
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  سعر الشراء:
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {typeof product.purchase_price === "number"
                    ? product.purchase_price.toFixed(2)
                    : Number(product.purchase_price || 0).toFixed(2)}{" "}
                  ج.م
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  المخزون:
                </span>
                <Badge
                  variant={
                    product.stock > product.min_stock
                      ? "default"
                      : "destructive"
                  }
                >
                  {product.stock}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  الحد الأدنى للمخزون:
                </span>
                <span className="text-sm text-gray-800 dark:text-gray-300">
                  {product.min_stock}
                </span>
              </div>
              {product.barcode && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    الباركود:
                  </span>
                  <span className="text-xs font-mono bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded dark:text-gray-300">
                    {product.barcode}
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Can action="update" subject="Product">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(product)}
                    className="flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    تعديل
                  </Button>
                </Can>
                <Can action="delete" subject="Product">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </Can>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="bg-white/60 backdrop-blur-sm border-blue-100 dark:bg-slate-800/60 dark:border-slate-700">
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              لا توجد منتجات متاحة
            </p>
            {products.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                لم يتم العثور على نتائج للبحث: "{searchTerm}"
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(Math.max(currentPage - 1, 0))}
            disabled={currentPage === 0}
            className={`transition-all duration-200 flex items-center gap-1 ${
              currentPage > 0
                ? "text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-slate-700"
                : "text-gray-400 cursor-not-allowed dark:text-gray-600"
            }`}
          >
            السابق
          </Button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            الصفحة {currentPage + 1} من {pageCount}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handlePageChange(Math.min(currentPage + 1, pageCount - 1))
            }
            disabled={currentPage >= pageCount - 1}
            className={`transition-all duration-200 flex items-center gap-1 ${
              currentPage < pageCount - 1
                ? "text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-slate-700"
                : "text-gray-400 cursor-not-allowed dark:text-gray-600"
            }`}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
