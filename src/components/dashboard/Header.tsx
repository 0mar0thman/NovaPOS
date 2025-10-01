import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Menu,
  X,
  LogOut,
  Store,
  Wifi,
  WifiOff,
  ShieldAlert,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Receipt,
  UserPlus,
} from "lucide-react";
import { useUser } from "@/components/dashboard/UserContext";
import { Can } from "@/components/Can";

interface HeaderProps {
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const Header = ({ onLogout, activeTab, setActiveTab }: HeaderProps) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // اكتشاف حجم الشاشة
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // اكتشاف حالة الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // إشعار بصري عند العودة للاتصال
      showConnectionNotification("تم استعادة الاتصال بالإنترنت", "success");
    };

    const handleOffline = () => {
      setIsOnline(false);
      // إشعار بصري عند فقدان الاتصال
      showConnectionNotification("فقدان الاتصال بالإنترنت", "error");
    };

    // الاستماع لتغيرات حالة الاتصال
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // فحص الاتصال بشكل دوري للتأكد من دقة الحالة
    const connectionInterval = setInterval(async () => {
      try {
        const response = await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
        });
        if (!isOnline) setIsOnline(true);
      } catch (error) {
        if (isOnline) setIsOnline(false);
      }
    }, 30000); // فحص كل 30 ثانية

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(connectionInterval);
    };
  }, [isOnline]);

  // وظيفة لعرض الإشعارات
  const showConnectionNotification = (
    message: string,
    type: "success" | "error"
  ) => {
    // يمكنك استبدال هذا بتنفيذ نظام الإشعارات الخاص بك
    console.log(`${type.toUpperCase()}: ${message}`);

    // مثال بسيط باستخدام alert - يمكن استبداله بمكون إشعار احترافي
    if (type === "error") {
      // عرض alert فقط عند فقدان الاتصال لتجنب الإزعاج
      setTimeout(() => {
        if (!navigator.onLine) {
          alert(
            "⚠️ تنبيه: فقدان الاتصال بالإنترنت. بعض الميزات قد لا تعمل بشكل صحيح."
          );
        }
      }, 1000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
    onLogout();
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleTabClick = (value: string) => {
    setActiveTab(value);
    setSidebarOpen(false);
  };

  // التابات للقائمة الجانبية في الجوال
  const mobileTabs = [
    {
      value: "sales",
      label: "نقطة البيع",
      icon: <ShoppingCart className="w-5 h-5" />,
    },
    {
      value: "sales-invoices",
      label: "فواتير المبيعات",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      value: "invoices",
      label: "فواتير الشراء",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      value: "products",
      label: "المنتجات",
      icon: <Package className="w-5 h-5" />,
    },
    {
      value: "reports",
      label: "التقارير",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      value: "users",
      label: "المستخدمون",
      icon: <UserPlus className="w-5 h-5" />,
    },
  ];

  // مكون Badge الخاص بالاتصال
  const ConnectionBadge = () => (
    <Badge
      variant="secondary"
      className={`flex items-center gap-1 flex-row-reverse border-0 ${
        isOnline
          ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100"
          : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 animate-pulse"
      }`}
    >
      {isOnline ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      {isOnline ? "متصل" : "غير متصل"}
    </Badge>
  );

  return (
    <>
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-row-reverse">
            {/* الجزء الأيمن (بدل الأيسر): الشعار وزر القائمة */}
            <div className="flex items-center gap-4 flex-row-reverse">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block md:hidden"
                aria-label="فتح القائمة"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-3 flex-row-reverse">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isOnline
                      ? "bg-gradient-to-r from-blue-600 to-purple-600"
                      : "bg-gradient-to-r from-gray-400 to-gray-600"
                  }`}
                >
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-right">
                    نظام نقطة البيع
                  </h1>
                  {currentUser && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-right">
                      مرحباً، {currentUser.name}
                      {!isOnline && (
                        <span className="text-red-500 mr-1"> ⚠️</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* الجزء الأيسر (بدل الأيمن): الحالة والإعدادات */}
            <div className="flex items-center gap-3 flex-row-reverse">
              {/* معلومات المستخدم */}
              {currentUser && (
                <div
                  className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isOnline
                      ? "bg-slate-100 dark:bg-slate-800"
                      : "bg-orange-50 dark:bg-orange-900/20"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isOnline
                        ? "bg-gradient-to-r from-blue-500 to-purple-500"
                        : "bg-gradient-to-r from-gray-400 to-gray-600"
                    }`}
                  >
                    <span className="text-white font-bold text-sm">
                      {currentUser.name.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {currentUser.name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {currentUser?.email || "admin@example.com"}
                    </p>
                  </div>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 flex-row-reverse">
                <ConnectionBadge />
                <Badge
                  variant="outline"
                  className={`text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 flex items-center gap-1 flex-row-reverse transition-colors ${
                    !isOnline ? "opacity-50" : ""
                  }`}
                >
                  <Store className="w-3 h-3" />
                  المتجر الرئيسي
                </Badge>
              </div>

              <ThemeToggle />

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-1 flex-row-reverse"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </button>
            </div>
          </div>

          {/* شريط حالة الاتصال للجوال */}
          {!isOnline && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 text-red-700 dark:text-red-300 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>أنت غير متصل بالإنترنت - بعض الميزات قد لا تعمل</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* القائمة الجانبية - من اليمين فقط */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={toggleSidebar}
      >
        {/* طبقة التعتيم الخلفية */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        {/* القائمة نفسها */}
        <div
          className={`absolute right-0 top-0 h-full w-80 max-w-full bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* رأس القائمة */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">

            {/* معلومات المستخدم */}
            <div
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors flex-row-reverse mt-14 ${
                isOnline
                  ? "bg-slate-50 dark:bg-slate-800"
                  : "bg-orange-50 dark:bg-orange-900/20"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isOnline
                    ? "bg-gradient-to-r from-blue-500 to-purple-500"
                    : "bg-gradient-to-r from-gray-400 to-gray-600"
                }`}
              >
                <span className="text-white font-bold">
                  {currentUser ? currentUser.name.charAt(0) : "م"}
                </span>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {currentUser?.name || "مستخدم"}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentUser?.email || "لا يوجد"}
                </p>
                {!isOnline && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ وضع عدم الاتصال
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* محتوى القائمة - التابات في وضع الجوال */}
          <nav className="p-4">
            <ul className="space-y-2">
             {mobileTabs.map((tab) => (
                <li key={tab.value}>
                  <Can
                    action="read"
                    subject={
                      tab.value === "users"
                        ? "User"
                        : tab.value === "reports"
                        ? "Reports"
                        : tab.value === "products"
                        ? "Product"
                        : tab.value === "invoices"
                        ? "PurchaseInvoice"
                        : tab.value === "sales-invoices"
                        ? "SalesInvoice"
                        : "Dashboard"
                    }
                    fallback={
                      <div className="w-full text-right p-3 rounded-lg flex items-center justify-between flex-row-reverse text-gray-400 text-sm">
                        <span>{tab.label} (غير مصرح)</span>
                        <span className="text-lg">{tab.icon}</span>
                      </div>  
                    }
                      >
                      <button
                        className={`w-full text-right p-3 rounded-lg transition-colors flex items-center justify-between flex-row-reverse ${
                          activeTab === tab.value
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        } ${!isOnline ? "opacity-70" : ""}`}
                        onClick={() => handleTabClick(tab.value)}
                        disabled={!isOnline && tab.value !== "sales"}
                      >
                        <span>{tab.label}</span>
                        <span className="text-lg">{tab.icon}</span>
                        {!isOnline && tab.value !== "sales" && (
                          <WifiOff className="w-3 h-3 text-red-500 ml-1" />
                        )}
                      </button>
                    </Can>
                  </li>
                ))}

            </ul>
          </nav>

          {/* قسم الحالة في القائمة */}
          <div className="absolute left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between text-sm flex-row-reverse">
                <span className="text-slate-600 dark:text-slate-400">
                  الحالة
                </span>
                <ConnectionBadge />
              </div>
              <div className="flex items-center justify-between text-sm flex-row-reverse">
                <span className="text-slate-600 dark:text-slate-400">
                  المتجر
                </span>
                <span
                  className={`text-slate-800 dark:text-slate-200 transition-colors ${
                    !isOnline ? "text-orange-600 dark:text-orange-400" : ""
                  }`}
                >
                  المتجر الرئيسي
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
