import { Badge } from "@/components/ui/badge";
import { Calculator } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onLogout: () => void;
}

const Header = ({ onLogout }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm border-b border-blue-100 dark:border-slate-700 sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transition-all duration-300">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400 transition-all duration-300">
                نظام نقطة البيع
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-all duration-300">
                إدارة ذكية للمبيعات والمخزون
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-200 dark:border-green-700 transition-all duration-300"
            >
              متصل
            </Badge>
            <Badge
              variant="outline"
              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500 transition-all duration-300"
            >
              المتجر الرئيسي
            </Badge>
            <ThemeToggle />
            <Badge
              variant="secondary"
              onClick={handleLogout}
              className="cursor-pointer text-sm px-3 py-1.5 border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-100 dark:border-red-700 dark:hover:bg-red-800 transition-all duration-300"
            >
              تسجيل الخروج
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;