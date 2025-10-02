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
      <Card className="bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm border-blue-100 dark:border-slate-700 transition-all duration-300">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                فواتير المبيعات
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                إجمالي الفواتير: {invoicesCount} فاتورة
              </p>
              {currentUser && (
                <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                  <span>
                    البائع الحالي: <strong className="dark:text-gray-200">{currentUser?.name || "غير معروف"}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Can action="create" subject="SalesInvoice">
                <Button
                  onClick={onNewInvoice}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 dark:text-gray-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  فاتورة جديدة
                </Button>
              </Can>
              {ability.can('read', 'Customer') && (
                <Button
                  onClick={() => setIsCustomerManagementOpen(true)}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
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
        <DialogContent className="max-w-7xl dark:bg-slate-800 dark:border-slate-700 p-2" dir="rtl">
          <CustomersManagement onCustomerChange={onCustomerChange} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;