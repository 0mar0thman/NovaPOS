import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Can } from "@/components/Can";
import { Actions, Subjects } from "@/config/ability";
import { AppAbility } from "@/config/ability";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Receipt,
  UserPlus,
} from "lucide-react";

export interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  ability: AppAbility;
}

interface Tab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: { action: Actions; subject: Subjects };
}

const tabs: Tab[] = [
  {
    value: "users",
    label: "المستخدمون",
    icon: UserPlus,
    permission: { action: "read", subject: "User" },
  },
  {
    value: "reports",
    label: "التقارير",
    icon: BarChart3,
    permission: { action: "read", subject: "Reports" },
  },
  {
    value: "products",
    label: "المنتجات",
    icon: Package,
    permission: { action: "read", subject: "Product" },
  },
  {
    value: "invoices",
    label: "فواتير الشراء",
    icon: FileText,
    permission: { action: "read", subject: "PurchaseInvoice" },
  },
  {
    value: "sales-invoices",
    label: "فواتير المبيعات",
    icon: Receipt,
    permission: { action: "read", subject: "SalesInvoice" },
  },
  {
    value: "sales",
    label: "نقطة البيع",
    icon: ShoppingCart,
    permission: { action: "read", subject: "Dashboard" },
  },
];

export const NavigationTabs = ({
  activeTab,
  setActiveTab,
  ability,
}: NavigationTabsProps) => {
  const [isMobile, setIsMobile] = useState(false);

  // اكتشاف حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // إخفاء التابات في الجوال
  if (isMobile) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList
        className="grid w-full text-center grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm border border-blue-100 dark:border-slate-700 h-16 transition-all duration-300"
        // dir="rtl"
      >
        {tabs.map(({ value, label, icon: Icon, permission }) => (
          <Can
            key={value}
            action={permission.action}
            subject={permission.subject}
            fallback={
              <div className="flex flex-col items-center justify-center text-gray-400 text-xs p-2">
                <Icon className="w-5 h-5 mb-1" />
                {label} (غير مصرح)
              </div>
            }
          >
            <TabsTrigger
              value={value} 
              className="flex-col gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white dark:data-[state=active]:from-blue-600 dark:data-[state=active]:to-purple-600 transition-all duration-300"
            >
              <Icon className="w-5 h-5 text-gray-600 dark:text-gray-200 transition-all duration-300" />
              <span className="text-xs text-gray-600 dark:text-gray-200 transition-all duration-300">
                {label}
              </span>
            </TabsTrigger>
          </Can>
        ))}
      </TabsList>
    </Tabs>
  );
};

export default NavigationTabs;