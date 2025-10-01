import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Users, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import api from "@/lib/axios";
import { InvoiceList } from "./invoice-list/InvoiceList";
import { InvoiceFormDialog } from "./dialogs/InvoiceFormDialog";
import { InvoiceFilters } from "./filters/InvoiceFilters";
import { SupplierDialog } from "./dialogs/SupplierDialog";
import {
  PurchaseInvoice,
  Product,
  ProductOption,
  Supplier,
  User,
} from "./types/types";
import { Can } from "@/components/Can";
import { useInvoiceFilters } from "./hooks/useInvoiceFilters";
import { PrintLayout } from "./components/PrintTemplate/PrintLayout"; // Assuming PrintLayout is in a utils file

export const PurchaseInvoices = () => {
  const [allInvoices, setAllInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSupplierManagementOpen, setIsSupplierManagementOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  const canViewAllInvoices =
    currentUser?.roles?.includes("admin") ||
    currentUser?.roles?.includes("manager");

  const {
    search,
    setSearch,
    sort,
    setSort,
    paymentStatus,
    setPaymentStatus,
    dateFilter,
    setDateFilter,
    specificDate,
    setSpecificDate,
    specificWeek,
    setSpecificWeek,
    specificMonth,
    setSpecificMonth,
    selectedUserId,
    setSelectedUserId,
    exportOption,
    setExportOption,
    filteredInvoices,
    resetDateFilters,
    getLast7Days,
    getLast4Weeks,
    getLast12Months,
  } = useInvoiceFilters({
    allInvoices,
    currentUser,
    users,
    canViewAllInvoices,
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error(
          "لم يتم العثور على رمز المصادقة. يرجى تسجيل الدخول مرة أخرى."
        );
      }

      const [invoicesRes, productsRes, suppliersRes, usersRes, currentUserRes] =
        await Promise.allSettled([
          api.get("/api/purchase-invoices", {
            params: {
              include: "items.product.category,creator,cashier",
              per_page: 100,
            },
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/products", {
            params: { include: "category" },
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/suppliers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/api/get-user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (invoicesRes.status === "fulfilled") {
        const invoicesData = invoicesRes.value.data;
        let formattedInvoices = [];
        if (invoicesData.data && Array.isArray(invoicesData.data)) {
          formattedInvoices = invoicesData.data.map((invoice: any) => ({
            ...invoice,
            cashier: invoice.cashier
              ? {
                  ...invoice.cashier,
                  id: String(invoice.cashier.id),
                  deleted_at: invoice.cashier.deleted_at || null,
                }
              : undefined,
            creator: invoice.creator
              ? {
                  ...invoice.creator,
                  id: String(invoice.creator.id),
                  deleted_at: invoice.creator.deleted_at || null,
                }
              : undefined,
            user_id: String(invoice.user_id),
            cashier_name: invoice.cashier_name,
            user_name: invoice.user_name,
            cashier_display_name: invoice.cashier_display_name,
            user_display_name: invoice.user_display_name,
          }));
        } else if (Array.isArray(invoicesData)) {
          formattedInvoices = invoicesData.map((invoice: any) => ({
            ...invoice,
            cashier: invoice.cashier
              ? {
                  ...invoice.cashier,
                  id: String(invoice.cashier.id),
                  deleted_at: invoice.cashier.deleted_at || null,
                }
              : undefined,
            creator: invoice.creator
              ? {
                  ...invoice.creator,
                  id: String(invoice.creator.id),
                  deleted_at: invoice.creator.deleted_at || null,
                }
              : undefined,
            user_id: String(invoice.user_id),
            cashier_name: invoice.cashier_name,
            user_name: invoice.user_name,
            cashier_display_name: invoice.cashier_display_name,
            user_display_name: invoice.user_display_name,
          }));
        }
        setAllInvoices(formattedInvoices);
      } else {
        console.error("Error fetching invoices:", invoicesRes.reason);
        setError("فشل تحميل الفواتير");
      }

      if (productsRes.status === "fulfilled") {
        setProducts(productsRes.value.data || []);
        const options = (productsRes.value.data || []).map(
          (product: Product) => ({
            value: product.id,
            label: `${product.name} (${product.stock} متوفر)`,
            product,
          })
        );
        setProductOptions(options);
      }

      if (suppliersRes.status === "fulfilled") {
        const suppliersData = suppliersRes.value.data;
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      }

      if (usersRes.status === "fulfilled") {
        const usersData = usersRes.value.data.users || usersRes.value.data;
        const formattedUsers = Array.isArray(usersData)
          ? usersData.map((user: any) => ({
              id: String(user.id),
              name: user.name,
              roles: user.roles || [],
              deleted_at: user.deleted_at || null,
            }))
          : [];
        setUsers(formattedUsers);
      } else {
        console.error("Failed to fetch users:", usersRes.reason);
        setError("فشل تحميل بيانات المستخدمين");
        toast({
          title: "خطأ",
          description:
            "تعذر تحميل بيانات المستخدمين. تحقق من صلاحياتك أو تسجيل الدخول.",
          variant: "destructive",
        });
      }

      if (currentUserRes.status === "fulfilled") {
        const userData = currentUserRes.value.data?.user;
        if (userData) {
          const user = {
            id: String(userData.id),
            name: userData.name,
            roles: userData.roles || [],
            permissions: userData.permissions || [],
            deleted_at: userData.deleted_at || null,
          };
          setCurrentUser(user);
        }
      } else {
        console.error("Failed to fetch current user:", currentUserRes.reason);
        setError("فشل تحميل بيانات المستخدم الحالي");
      }
    } catch (error: any) {
      console.error("Error in fetchData:", error.message);
      setError(error.message || "فشل تحميل البيانات من السيرفر");
      toast({
        title: "خطأ",
        description: error.message || "حدث خطأ أثناء تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handlePrint = useCallback(
    (invoice: PurchaseInvoice) => {
      if (!currentUser) {
        toast({
          title: "خطأ",
          description: "المستخدم الحالي غير متوفر. يرجى تسجيل الدخول.",
          variant: "destructive",
        });
        return;
      }
      try {
        const result = PrintLayout(invoice, currentUser);
        if (result.includes("فشل")) {
          toast({
            title: "خطأ في الطباعة",
            description: result,
            variant: "destructive",
          });
        } else {
          toast({
            title: "نجاح",
            description: result,
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("Error during printing:", error);
        toast({
          title: "خطأ في الطباعة",
          description: "حدث خطأ أثناء محاولة الطباعة. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      }
    },
    [currentUser, toast]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading && (allInvoices.length === 0 || users.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <FileText className="w-12 h-12 text-red-500 dark:text-red-400" />
        <p className="text-lg font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
        <Button
          onClick={() => fetchData()}
          className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:blue-700"
        >
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
       <Card className="bg-white/60 backdrop-blur-sm border-blue-100 dark:bg-gray-800/60 dark:border-gray-700 transition-all duration-300">
  <CardHeader>
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
      {/* العنوان والمعلومات */}
      <div className="flex-1 min-w-0">
        <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-xl lg:text-2xl">
          <FileText className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
          <span className="truncate">فواتير المشتريات</span>
        </CardTitle>
        
        <div className="mt-2 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            إجمالي الفواتير: {filteredInvoices.length} فاتورة (من أصل{" "}
            {allInvoices.length})
          </p>
          
          {currentUser && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="truncate">
                المشتري الحالي:{" "}
                <strong className="dark:text-gray-200">
                  {currentUser.name}
                </strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* الأزرار */}
      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
        <Can action="create" subject="PurchaseInvoice">
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 w-full sm:w-auto justify-center lg:justify-start"
            size="sm"
          >
            <Plus className="w-4 h-4 ml-2 flex-shrink-0" />
            <span className="truncate">فاتورة جديدة</span>
          </Button>
        </Can>
        
        <Can action="read" subject="Supplier">
          <Button
            onClick={() => setIsSupplierManagementOpen(true)}
            variant="outline"
            className="border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 w-full sm:w-auto justify-center lg:justify-start"
            size="sm"
          >
            <Users className="w-4 h-4 ml-2 flex-shrink-0" />
            <span className="truncate">إدارة الموردين</span>
          </Button>
        </Can>
      </div>
    </div>
  </CardHeader>
</Card>

        <Can action="read" subject="PurchaseInvoice">
          <InvoiceFilters
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            specificDate={specificDate}
            setSpecificDate={setSpecificDate}
            specificWeek={specificWeek}
            setSpecificWeek={setSpecificWeek}
            specificMonth={specificMonth}
            setSpecificMonth={setSpecificMonth}
            currentUser={currentUser}
            users={users}
            canViewAllInvoices={canViewAllInvoices}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            exportOption={exportOption}
            setExportOption={setExportOption}
            allInvoices={allInvoices}
            resetDateFilters={resetDateFilters}
            getLast7Days={getLast7Days}
            getLast4Weeks={getLast4Weeks}
            getLast12Months={getLast12Months}
          />
        </Can>
      </div>

      <Can action="read" subject="PurchaseInvoice">
        <InvoiceList
          invoices={filteredInvoices}
          setInvoices={setAllInvoices}
          products={products}
          productOptions={productOptions}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          search={search}
          sort={sort}
          paymentStatus={paymentStatus}
          dateFilter={dateFilter}
          specificDate={specificDate}
          specificWeek={specificWeek}
          specificMonth={specificMonth}
          selectedUserId={selectedUserId}
          users={users}
          currentUser={currentUser} // Pass currentUser
          handlePrint={handlePrint}  // Pass handlePrint
        />
      </Can>

      <Can action="create" subject="PurchaseInvoice">
        <InvoiceFormDialog
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          setInvoices={setAllInvoices}
          products={products}
          productOptions={productOptions}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      </Can>

      <Can action="read" subject="Supplier">
        <SupplierDialog
          isOpen={isSupplierManagementOpen}
          onOpenChange={setIsSupplierManagementOpen}
          onSupplierChange={fetchData}
        />
      </Can>
    </>
  );
};