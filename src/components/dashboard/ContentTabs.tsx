import { TabsContent } from "@/components/ui/tabs";
import { Can } from "@/components/Can";
import SalesInterface from "@/components/sales-interface/SalesInterface";
import ProductManagement from "@/components/product_management/ProductManagement";
import { PurchaseInvoices } from "@/components/purchase-invoices/PurchaseInvoices";
import ReportsSection from "@/components/reports/ReportsSection";
import SalesInvoices from "@/components/sales_invoices/SalesInvoices";
import UserManagement from "@/components/user_management/UserManagement";
import { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // افتراض وجود مكون Alert لعرض رسائل الخطأ

const ContentTabs = () => {
  // مكون مخصص لعرض رسالة Fallback
  const PermissionDeniedAlert = ({ subject }: { subject: string }) => (
    <Alert variant="destructive" className="m-4">
      <AlertTitle>غير مصرح</AlertTitle>
      <AlertDescription>
        ليس لديك الصلاحية للوصول إلى قسم {subject}.
      </AlertDescription>
    </Alert>
  );

  return (
    <>
      <TabsContent value="sales" className="m-0 transition-all duration-300">
        <Can
          action="read"
          subject="Dashboard"
          fallback={<PermissionDeniedAlert subject="لوحة التحكم" />}
        >
          <SalesInterface />
        </Can>
      </TabsContent>

      <TabsContent
        value="sales-invoices"
        className="m-0 transition-all duration-300"
      >
        <Can
          action="read"
          subject="SalesInvoice"
          fallback={<PermissionDeniedAlert subject="فواتير المبيعات" />}
        >
          <SalesInvoices />
        </Can>
      </TabsContent>
      <TabsContent value="invoices" className="m-0 transition-all duration-300">
        <Can
          action="read"
          subject="PurchaseInvoice"
          fallback={<PermissionDeniedAlert subject="فواتير الشراء" />}
        >
          <PurchaseInvoices />
        </Can>
      </TabsContent>
      <TabsContent value="products" className="m-0 transition-all duration-300">
        <Can
          action="read"
          subject="Product"
          fallback={<PermissionDeniedAlert subject="المنتجات" />}
        >
          <ProductManagement />
        </Can>
      </TabsContent>
      <TabsContent value="reports" className="m-0 transition-all duration-300">
        <Can
          action="read"
          subject="Reports"
          fallback={<PermissionDeniedAlert subject="التقارير" />}
        >
          <ReportsSection />
        </Can>
      </TabsContent>
      <TabsContent value="users" className="m-0 transition-all duration-300">
        <Can
          action="read"
          subject="User"
          fallback={<PermissionDeniedAlert subject="المستخدمين" />}
        >
          <UserManagement />
        </Can>
      </TabsContent>
    </>
  );
};

export default ContentTabs;
