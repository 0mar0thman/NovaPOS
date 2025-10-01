// SupplierDialog.tsx
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  Search,
  BarChart2,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";
import { Supplier, PurchaseInvoice } from "../types/types";
import { FaUsers } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { safeToFixed } from "../types/utils";
import { Can } from "@/components/Can";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SupplierDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierChange: () => void;
}

export const SupplierDialog = ({
  isOpen,
  onOpenChange,
  onSupplierChange,
}: SupplierDialogProps) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    phone: "",
    notes: "",
  });
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const suppliersPerPage = 10;
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/suppliers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        params: {
          per_page: suppliersPerPage,
          page: currentPage,
          search: searchTerm || undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
        },
      });
      const supplierData = Array.isArray(response.data.data.data)
        ? response.data.data.data
        : [];
      setSuppliers(supplierData);
      setTotalSuppliers(response.data.data.total || supplierData.length);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      setSuppliers([]);
      toast({
        title: "خطأ",
        description: "فشل جلب قائمة الموردين",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/purchase-invoices", {
        params: { include: "items.product" },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const invoiceData = Array.isArray(response.data.data)
        ? response.data.data
        : [];
      setInvoices(invoiceData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setInvoices([]);
      toast({
        title: "خطأ",
        description: "فشل جلب قائمة الفواتير",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchInvoices();
    }
  }, [isOpen, currentPage, searchTerm, filterStatus]);

  const validateSupplierForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!newSupplier.name.trim()) {
      newErrors.name = "اسم المورد مطلوب";
    }
    if (!newSupplier.phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!/^01\d{9}$/.test(newSupplier.phone)) {
      newErrors.phone = "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      await fetchSuppliers();
      setIsAddModalOpen(false);
      setNewSupplier({ name: "", phone: "", notes: "" });
      setErrors({});
      onSupplierChange();
      toast({
        title: "تم الإضافة",
        description: `تم إضافة المورد ${newSupplier.name} بنجاح`,
      });
    } catch (error: any) {
      console.error("Error adding supplier:", error);
      let errorMessage = "حدث خطأ أثناء إضافة المورد";
      if (error.response?.status === 422) {
        errorMessage = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
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

  const handleEditSupplier = async () => {
    if (!editSupplier || !validateSupplierForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء في حقول المورد",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await api.put(
        `/api/suppliers/${editSupplier.id}`,
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
      await fetchSuppliers();
      setIsEditModalOpen(false);
      setNewSupplier({ name: "", phone: "", notes: "" });
      setEditSupplier(null);
      setErrors({});
      onSupplierChange();
      toast({
        title: "تم التحديث",
        description: `تم تحديث المورد ${newSupplier.name} بنجاح`,
      });
    } catch (error: any) {
      console.error("Error updating supplier:", error);
      let errorMessage = "حدث خطأ أثناء تحديث المورد";
      if (error.response?.status === 422) {
        errorMessage = Object.values(error.response.data.errors)
          .flat()
          .join(", ");
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

  const handleDeleteSupplier = async (id: number) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/suppliers/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      await fetchSuppliers();
      onSupplierChange();
      toast({
        title: "تم الحذف",
        description: "تم حذف المورد بنجاح",
      });
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      let errorMessage = "حدث خطأ أثناء حذف المورد";
      if (error.response?.status === 400) {
        errorMessage = "لا يمكن حذف المورد لأنه مرتبط بفواتير مشتريات";
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

  const supplierReports = useMemo(() => {
    const reports = suppliers.map((supplier) => {
      const supplierInvoices = invoices.filter(
        (inv) => inv.supplier_id === supplier.id
      );
      const invoiceCount = supplierInvoices.length;
      const totalAmount = supplierInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0
      );
      const amountPaid = supplierInvoices.reduce(
        (sum, inv) => sum + Number(inv.amount_paid || 0),
        0
      );
      const remainingAmount = totalAmount - amountPaid;

      const productQuantities: {
        [productId: number]: { name: string; quantity: number };
      } = {};
      supplierInvoices.forEach((inv) => {
        inv.items.forEach((item) => {
          const productId = item.product_id;
          const itemQuantity =
            (item.quantity || 1) * (item.number_of_units || 1);
          if (!productQuantities[productId]) {
            productQuantities[productId] = {
              name: item.product?.name || "غير معروف",
              quantity: 0,
            };
          }
          productQuantities[productId].quantity += itemQuantity;
        });
      });

      const mostSoldProduct = Object.values(productQuantities).sort(
        (a, b) => b.quantity - a.quantity
      )[0] || { name: "لا يوجد", quantity: 0 };

      return {
        ...supplier,
        invoiceCount,
        totalAmount,
        amountPaid,
        remainingAmount,
        mostSoldProduct,
      };
    });

    const mostInteracted = reports.sort(
      (a, b) => b.invoiceCount - a.invoiceCount
    )[0];

    return { reports, mostInteracted };
  }, [suppliers, invoices]);

  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const totalPages = Math.ceil(totalSuppliers / suppliersPerPage);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-7xl max-h-[90vh] overflow-y-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl p-4 sm:p-6"
          dir="rtl"
        >
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl">
              <CardHeader className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-300">
                      <FaUsers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      إدارة الموردين
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      إجمالي الموردين: {totalSuppliers} | المعروض:{" "}
                      {suppliers.length}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Can action="read" subject="Reports">
                      <Button
                        onClick={() => setIsReportsModalOpen(true)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors duration-200"
                      >
                        <BarChart2 className="w-4 h-4 mr-2" />
                        التقارير
                      </Button>
                    </Can>
                    <Can action="create" subject="Supplier">
                      <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-colors duration-200"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        مورد جديد
                      </Button>
                    </Can>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Search and Filter */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl">
              <CardHeader className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      className="pl-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <Select
                    value={filterStatus}
                    onValueChange={(value: "all" | "active" | "inactive") => {
                      setFilterStatus(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg">
                      <SelectValue placeholder="حالة المورد">
                        {filterStatus === "all"
                          ? "جميع الموردين"
                          : filterStatus === "active"
                          ? "الموردين النشطين"
                          : "الموردين غير النشطين"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg">
                      <SelectItem value="all">جميع الموردين</SelectItem>
                      <SelectItem value="active">الموردين النشطين</SelectItem>
                      <SelectItem value="inactive">
                        الموردين غير النشطين
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 py-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-500 dark:text-blue-400" />
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
                    لا يوجد موردين لعرضهم
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <div className="block md:hidden space-y-4">
                      {suppliers.map((supplier) => (
                        <Card
                          key={supplier.id}
                          className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm"
                        >
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                              <div className="text-left">
                                <p className="text-xs text-gray-500 dark:text-gray-400">#</p>
                                <p className="text-sm font-medium dark:text-gray-200">
                                  {supplier.id}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Can action="update" subject="Supplier">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditSupplier(supplier);
                                      setNewSupplier({
                                        name: supplier.name,
                                        phone: supplier.phone,
                                        notes: supplier.notes || "",
                                      });
                                      setIsEditModalOpen(true);
                                    }}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </Can>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/30"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <Can action="delete" subject="Supplier">
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteSupplier(supplier.id)}
                                        className="text-red-600 focus:text-red-600 dark:text-red-400"
                                      >
                                        <Trash2 className="w-4 h-4 ml-2" />
                                        حذف المورد
                                      </DropdownMenuItem>
                                    </Can>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {/* Supplier Info */}
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">اسم المورد</p>
                                <p className="font-medium dark:text-gray-200">{supplier.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">رقم الهاتف</p>
                                <p className="dark:text-gray-300">{supplier.phone}</p>
                              </div>
                              {supplier.notes && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">الملاحظات</p>
                                  <p className="text-sm dark:text-gray-300 truncate">
                                    {supplier.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto rounded-xl shadow-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800">
                            <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                              الرقم
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                              الاسم
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                              رقم الهاتف
                            </TableHead>
                            <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                              الملاحظات
                            </TableHead>
                            <Can action="delete" subject="Supplier">
                              <Can action="update" subject="Supplier">
                                <TableHead className="text-center text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                                  الإجراءات
                                </TableHead>
                              </Can>
                            </Can>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suppliers.map((supplier) => (
                            <TableRow
                              key={supplier.id}
                              className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                            >
                              <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                                {supplier.id}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-gray-800 dark:text-gray-200 py-3">
                                {supplier.name}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">
                                {supplier.phone}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-gray-400 py-3">
                                {supplier.notes ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="truncate block max-w-[150px]">
                                          {supplier.notes}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                        <p>{supplier.notes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <Can action="delete" subject="Supplier">
                                <Can action="update" subject="Supplier">
                                  <TableCell className="text-right py-3">
                                    <div className="flex gap-2 justify-end">
                                      <Can action="update" subject="Supplier">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setEditSupplier(supplier);
                                                  setNewSupplier({
                                                    name: supplier.name,
                                                    phone: supplier.phone,
                                                    notes: supplier.notes || "",
                                                  });
                                                  setIsEditModalOpen(true);
                                                }}
                                                className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200"
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                              تعديل المورد
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </Can>
                                      <Can action="delete" subject="Supplier">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                  handleDeleteSupplier(
                                                    supplier.id
                                                  )
                                                }
                                                disabled={isLoading}
                                                className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors duration-200"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-gray-900 dark:text-gray-100">
                                              حذف المورد
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </Can>
                                    </div>
                                  </TableCell>
                                </Can>
                              </Can>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div
                        className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6"
                        dir="rtl"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          عرض {suppliers.length} من أصل {totalSuppliers} مورد
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(prev - 1, 1))
                            }
                            disabled={currentPage === 1}
                            className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-1"
                          >
                            <ChevronRight className="w-4 h-4" />
                            السابق
                          </Button>
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <Button
                              key={page}
                              size="sm"
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 text-sm font-medium ${
                                currentPage === page
                                  ? "bg-blue-600 text-white dark:bg-blue-700 dark:text-gray-200"
                                  : "border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700"
                              }`}
                            >
                              {page}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(prev + 1, totalPages)
                              )
                            }
                            disabled={currentPage >= totalPages}
                            className="border-blue-300 dark:border-slate-600 text-blue-600 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-1"
                          >
                            التالي
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <DialogFooter className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="text-sm border-blue-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm"
              >
                إغلاق
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

{/* Reports Modal */}
<Can action="read" subject="Reports">
  <Dialog open={isReportsModalOpen} onOpenChange={setIsReportsModalOpen}>
    <DialogContent
      className="sm:max-w-7xl max-h-[90vh] overflow-y-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl p-4 sm:p-6"
      dir="rtl"
    >
      <DialogHeader>
        <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          تقارير الموردين
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
          عرض تقارير شاملة عن الموردين
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Most Interacted Supplier */}
        <div>
          <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-300">
            أكثر مورد تعامل
          </h3>
          {supplierReports.mostInteracted ? (
            <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl">
              <div className="block md:hidden space-y-3">
                {/* Mobile View */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الاسم</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {supplierReports.mostInteracted.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">عدد الفواتير</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {supplierReports.mostInteracted.invoiceCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {supplierReports.mostInteracted.totalAmount.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">المتبقي</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {supplierReports.mostInteracted.remainingAmount.toFixed(2)} ج.م
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                {/* Desktop View - نفس التصميم الأصلي */}
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong>الاسم:</strong> {supplierReports.mostInteracted.name}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong>عدد الفواتير:</strong> {supplierReports.mostInteracted.invoiceCount}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong>الإجمالي:</strong> {supplierReports.mostInteracted.totalAmount.toFixed(2)} ج.م
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <strong>المتبقي:</strong> {supplierReports.mostInteracted.remainingAmount.toFixed(2)} ج.م
                </p>
              </div>
            </Card>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد بيانات</p>
          )}
        </div>

        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
          تقارير الموردين
        </h3>

        {/* Mobile Cards View */}
        <div className="block md:hidden space-y-4">
          {supplierReports.reports.map((report) => (
            <Card
              key={report.id}
              className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {report.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {report.invoiceCount} فاتورة
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">الإجمالي</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {report.totalAmount.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">المدفوع</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {report.amountPaid.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">المتبقي</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {report.remainingAmount.toFixed(2)} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">أكثر منتج</p>
                    <p className="text-gray-700 dark:text-gray-300 text-xs">
                      {report.mostSoldProduct.name} - {report.mostSoldProduct.quantity}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop Table View - نفس التصميم الأصلي تماماً */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800">
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  الاسم
                </TableHead>
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  عدد الفواتير
                </TableHead>
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  الإجمالي
                </TableHead>
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  المدفوع
                </TableHead>
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  المتبقي
                </TableHead>
                <TableHead className="text-right text-sm font-semibold text-blue-900 dark:text-blue-300 py-3">
                  أكثر منتج مبيعًا (الاسم - الكمية)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierReports.reports.map((report) => (
                <TableRow
                  key={report.id}
                  className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                >
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.name}
                  </TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.invoiceCount}
                  </TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.totalAmount.toFixed(2)} ج.م
                  </TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.amountPaid.toFixed(2)} ج.م
                  </TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.remainingAmount.toFixed(2)} ج.م
                  </TableCell>
                  <TableCell className="text-sm text-gray-800 dark:text-gray-200 py-3">
                    {report.mostSoldProduct.name} - {report.mostSoldProduct.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter className="pt-4 border-t border-gray-200 dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsReportsModalOpen(false)}
          disabled={isLoading}
          className="text-sm border-blue-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm"
        >
          إغلاق
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</Can>
      {/* Add Supplier Modal */}
      <Can action="create" subject="Supplier">
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent
            className="sm:max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl p-4 sm:p-6"
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
                    setNewSupplier((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      name: e.target.value.trim() ? "" : "اسم المورد مطلوب",
                    }));
                  }}
                  placeholder="أدخل اسم المورد"
                  required
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.name}
                  </p>
                )}
              </div>
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
                      setErrors((prev) => ({
                        ...prev,
                        phone: value.trim() ? "" : "رقم الهاتف مطلوب",
                      }));
                    }
                  }}
                  onBlur={() => {
                    if (!/^01\d{9}$/.test(newSupplier.phone)) {
                      setErrors((prev) => ({
                        ...prev,
                        phone: "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, phone: "" }));
                    }
                  }}
                  placeholder="01XXXXXXXXX"
                  required
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                  type="tel"
                  inputMode="numeric"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.phone}
                  </p>
                )}
              </div>
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
                    setNewSupplier((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="ملاحظات إضافية"
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-3 sm:justify-start pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                type="button"
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg px-4 py-2 shadow-sm transition-colors duration-200"
                onClick={handleAddSupplier}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4 text-white" />
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
                  setIsAddModalOpen(false);
                  setNewSupplier({ name: "", phone: "", notes: "" });
                  setErrors({});
                }}
                disabled={isLoading}
                className="text-sm border-blue-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Can>

      {/* Edit Supplier Modal */}
      <Can action="update" subject="Supplier">
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent
            className="sm:max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200 dark:border-slate-700 shadow-md rounded-xl p-4 sm:p-6"
            dir="rtl"
          >
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                تعديل المورد
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                يرجى تعديل بيانات المورد
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="editSupplierName"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  اسم المورد *
                </Label>
                <Input
                  id="editSupplierName"
                  value={newSupplier.name}
                  onChange={(e) => {
                    setNewSupplier((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                    setErrors((prev) => ({
                      ...prev,
                      name: e.target.value.trim() ? "" : "اسم المورد مطلوب",
                    }));
                  }}
                  placeholder="أدخل اسم المورد"
                  required
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                />
                {errors.name && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="editSupplierPhone"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  رقم الهاتف *
                </Label>
                <Input
                  id="editSupplierPhone"
                  value={newSupplier.phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 11) {
                      setNewSupplier((prev) => ({ ...prev, phone: value }));
                      setErrors((prev) => ({
                        ...prev,
                        phone: value.trim() ? "" : "رقم الهاتف مطلوب",
                      }));
                    }
                  }}
                  onBlur={() => {
                    if (!/^01\d{9}$/.test(newSupplier.phone)) {
                      setErrors((prev) => ({
                        ...prev,
                        phone: "رقم الهاتف يجب أن يكون 11 رقمًا ويبدأ بـ 01",
                      }));
                    } else {
                      setErrors((prev) => ({ ...prev, phone: "" }));
                    }
                  }}
                  placeholder="01XXXXXXXXX"
                  required
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                  type="tel"
                  inputMode="numeric"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="editSupplierNotes"
                  className="text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  ملاحظات
                </Label>
                <Input
                  id="editSupplierNotes"
                  value={newSupplier.notes}
                  onChange={(e) =>
                    setNewSupplier((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="ملاحظات إضافية"
                  disabled={isLoading}
                  className="pr-3 pl-3 py-2 h-10 text-sm bg-white dark:bg-slate-800 border-blue-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-3 sm:justify-start pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                type="button"
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-lg px-4 py-2 shadow-sm transition-colors duration-200"
                onClick={handleEditSupplier}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4 text-white" />
                    جاري التحديث...
                  </span>
                ) : (
                  "تحديث المورد"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setNewSupplier({ name: "", phone: "", notes: "" });
                  setEditSupplier(null);
                  setErrors({});
                }}
                disabled={isLoading}
                className="text-sm border-blue-300 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-700 dark:text-gray-200 font-semibold rounded-lg px-4 py-2 shadow-sm"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Can>
    </>
  );
};