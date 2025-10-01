import { useState, useContext } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, User, Plus, Users, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Cashier, Customer } from "./SalesInvoices";
import CustomersManagement from "./CustomersManagement";
import { AbilityContext } from "@/config/ability";
import { Can } from '@/components/Can';

interface HeaderProps {
  currentUser: Cashier | null;
  invoicesCount: number;
  filteredInvoicesCount: number;
  onNewInvoice: () => void;
  onCustomerChange: () => Promise<void>;
  customers: Customer[];
  canViewAllInvoices: boolean;
}

const Header = ({
  currentUser,
  invoicesCount,
  filteredInvoicesCount,
  onNewInvoice,
  onCustomerChange,
  customers,
  canViewAllInvoices,
}: HeaderProps) => {
  const [isCustomerManagementOpen, setIsCustomerManagementOpen] = useState(false);
  const ability = useContext(AbilityContext);

  return (
    <>
      <Card className="bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 transition-all duration-300 w-full mx-auto">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300 text-lg sm:text-xl md:text-2xl">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                فواتير المبيعات
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                إجمالي الفواتير: {invoicesCount} فاتورة
              </p>
              {currentUser && (
                <div className="flex items-center mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                  <span>
                    البائع الحالي: <strong className="dark:text-gray-200">{currentUser?.name || "غير معروف"}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Can action="create" subject="SalesInvoice">
                <Button
                  onClick={onNewInvoice}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  فاتورة جديدة
                </Button>
              </Can>
              {ability.can('read', 'Customer') && (
                <Button
                  onClick={() => setIsCustomerManagementOpen(true)}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <Users className="w-4 h-4 mr-2" />
                  إدارة العملاء
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      <Dialog open={isCustomerManagementOpen} onOpenChange={setIsCustomerManagementOpen}>
        <DialogContent 
          className="w-full max-w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-7xl dark:bg-slate-800 dark:border-slate-700 p-2 sm:p-4"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl md:text-2xl">إدارة العملاء</DialogTitle>
          </DialogHeader>
          <CustomersManagement onCustomerChange={onCustomerChange} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;