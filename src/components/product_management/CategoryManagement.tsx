import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactPaginate from 'react-paginate';
import { Plus, Edit, Trash2, Tag, Package, Palette, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "@/lib/axios";
import { HexColorPicker } from "react-colorful";
import { Can } from "@/components/Can";

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface CategoryManagementProps {
  categories: Category[];
  onCategoriesUpdate: (categories: Category[]) => void;
}

const CategoryManagement = ({ categories, onCategoriesUpdate }: CategoryManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [categoriesPerPage] = useState(8);
  
  const { toast } = useToast();

  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
    "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"
  ];

  // Pagination logic
  const pageCount = Math.ceil(categories.length / categoriesPerPage);
  const offset = currentPage * categoriesPerPage;
  const currentCategories = categories.slice(offset, offset + categoriesPerPage);

  const handlePageClick = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم الفئة",
        variant: "destructive"
      });
      return;
    }

    if (!/^#[0-9A-F]{6}$/i.test(formData.color)) {
      toast({
        title: "خطأ في اللون",
        description: "يرجى إدخال كود لون صحيح (مثال: #3B82F6)",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let response;
      if (editingCategory) {
        response = await axios.put(
          `/api/categories/${editingCategory.id}`, 
          formData, 
          { headers }
        );
        toast({ 
          title: "تم التحديث", 
          description: `تم تحديث الفئة ${response.data.name}` 
        });
        
        const updatedCategories = categories.map(c =>
          c.id === editingCategory.id ? response.data : c
        );
        onCategoriesUpdate(updatedCategories);
      } else {
        response = await axios.post(
          '/api/categories', 
          formData, 
          { headers }
        );
        toast({ 
          title: "تم الإضافة", 
          description: `تمت إضافة الفئة ${response.data.name}` 
        });
        onCategoriesUpdate([...categories, response.data]);
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", description: "", color: "#3B82F6" });
      setCurrentPage(0);
    } catch (error: any) {
      console.error("Error saving category:", error);
      
      let errorMessage = "حدث خطأ أثناء حفظ الفئة";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      setIsLoading(true);
      
      await axios.delete(`/api/categories/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      onCategoriesUpdate(categories.filter(c => c.id !== id));
      toast({ 
        title: "تم الحذف", 
        description: "تم حذف الفئة بنجاح" 
      });
      
      if (currentCategories.length === 1 && currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error: any) {
      console.error("Error deleting category:", error);
      
      let errorMessage = "حدث خطأ أثناء حذف الفئة";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast({
        title: "خطأ في الحذف",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

return (
    <Card className="bg-white/60 backdrop-blur-sm border-blue-100 dark:bg-gray-800/60 dark:border-gray-700  transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
            <Tag className="w-5 h-5" />
            إدارة الفئات
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              إجمالي الفئات: {categories.length}
            </span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Can action="create" subject="Category">
                 <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 dark:from-green-600 dark:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700 dark:text-gray-200"
                        onClick={() => {
                          setEditingCategory(null);
                          setFormData({ name: "", description: "", color: "#3B82F6" });
                        }}
                        disabled={isLoading}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {isLoading ? "جاري التحميل..." : "إضافة فئة"}
                      </Button>
                 </DialogTrigger>
              </Can>
              <DialogContent className="sm:max-w-md dark:bg-gray-800" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="dark:text-white">
                    {editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="name" className="text-right dark:text-gray-200">اسم الفئة *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسم الفئة"
                      required
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="description" className="text-right dark:text-gray-200">وصف الفئة</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="وصف اختياري للفئة"
                      disabled={isLoading}
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-right dark:text-gray-200">لون الفئة</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="relative">
                        <button
                          type="button"
                          className="w-10 h-10 rounded-md border-2 border-gray-200 dark:border-gray-500"
                          style={{ backgroundColor: formData.color }}
                          onClick={() => setShowColorPicker(!showColorPicker)}
                        />
                        {showColorPicker && (
                          <div className="absolute z-10 mt-2">
                            <HexColorPicker
                              color={formData.color}
                              onChange={(color) => setFormData({ ...formData, color })}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="أدخل كود اللون (مثال: #3B82F6)"
                          className="font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-700 dark:border-gray-200' : 'border-gray-200 dark:border-gray-500'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, color })}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 dark:from-green-600 dark:to-emerald-600 dark:text-gray-200"
                      disabled={isLoading}
                    >
                      {isLoading ? "جاري الحفظ..." : (editingCategory ? "تحديث" : "إضافة")}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isLoading}
                      className="dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentCategories.map((category) => (
                <div
                  key={category.id}
                  className="p-3 bg-white rounded-lg border border-blue-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between group hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <span className="font-medium text-sm dark:text-white">{category.name}</span>
                      {category.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Can action="update" subject="Category">
                       <Button
                         size="sm"
                         variant="ghost"
                         onClick={() => handleEdit(category)}
                         className="h-6 w-6 p-0 dark:hover:bg-gray-700"
                         disabled={isLoading}
                       >
                         <Edit className="w-3 h-3 dark:text-gray-300" />
                       </Button>
                    </Can>
                    <Can action="delete" subject="Category">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(category.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>

            {categories.length > categoriesPerPage && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 0))}
                  disabled={currentPage === 0}
                  className={`transition-all duration-200 flex items-center gap-1 ${
                    currentPage > 0
                      ? "text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-gray-700"
                      : "text-gray-400 cursor-not-allowed dark:text-gray-500"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </Button>
            
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  الصفحة {currentPage + 1} من {pageCount}
                </span>
            
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(currentPage + 1, pageCount - 1))
                  }
                  disabled={currentPage >= pageCount - 1}
                  className={`transition-all duration-200 flex items-center gap-1 ${
                    currentPage < pageCount - 1
                      ? "text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-gray-700"
                      : "text-gray-400 cursor-not-allowed dark:text-gray-500"
                  }`}
                >
                  التالي
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            )}

          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-500" />
            <p>لا توجد فئات محددة</p>
            <p className="text-sm mt-2">قم بإضافة فئة جديدة لتنظيم المنتجات</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManagement;