// pages/Index.tsx
import { useState, useEffect, useContext } from "react";
import { Tabs } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { AbilityContext, createAppAbility } from "@/config/ability";
import { Loader2 } from "lucide-react";
import Header from "@/components/dashboard/Header";
import NavigationTabs from "@/components/dashboard/NavigationTabs";
import ContentTabs from "@/components/dashboard/ContentTabs";

const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const ability = useContext(AbilityContext);

  // ✅ دالة مساعدة للتحقق من التوكن
  const getValidToken = () => {
    const token = localStorage.getItem("auth_token");
    if (!token || token === "undefined" || token === "null") {
      return null;
    }
    return token;
  };

  // ✅ دالة لتحليل البيانات بشكل آمن
  const safeJSONParse = (data: string | null, fallback: any = []) => {
    try {
      if (!data || data === "undefined" || data === "null") {
        return fallback;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error("JSON parse error:", error);
      return fallback;
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getValidToken();
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await axios.get("/api/get-user", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // ✅ تحقق من وجود البيانات
        if (!response.data) {
          throw new Error("No user data received");
        }

        const permissions = response.data.permissions || [];
        console.log("User permissions:", permissions);

        // ✅ تحديث الصلاحيات بشكل آمن
        if (permissions.includes("manage-all")) {
          ability.update(createAppAbility([{ action: "manage", subject: "All" }]).rules);
        } else {
          const rules = permissions
            .filter((permission: string) => permission && typeof permission === "string")
            .map((permission: string) => {
              const [action, subject] = permission.split("-");
              return action && subject ? { action, subject } : null;
            })
            .filter(Boolean);
          
          ability.update(createAppAbility(rules).rules);
        }

        // ✅ تغيير التبويب الافتراضي إذا لزم الأمر
        if (!ability.can("read", "Dashboard")) {
          if (ability.can("read", "Reports")) {
            setActiveTab("reports");
          } else {
            navigate("/unauthorized");
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch user permissions:", error);
        
        // ✅ تنظيف البيانات التالفة
        localStorage.removeItem("auth_token");
        localStorage.removeItem("permissions");
        
        if (error.response?.status === 401) {
          navigate("/login", { replace: true });
        } else {
          toast({
            title: "خطأ",
            description: "فشل في تحميل بيانات المستخدم. يرجى تسجيل الدخول مرة أخرى.",
            variant: "destructive",
            className: "transition-all duration-300",
          });
          navigate("/login", { replace: true });
        }
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchCurrentUser();
  }, [navigate, ability, toast]);

  const handleLogout = () => {
    // ✅ تنظيف كامل للبيانات
    localStorage.removeItem("auth_token");
    localStorage.removeItem("permissions");
    localStorage.removeItem("user_data");
    navigate("/login", { replace: true });
  };

  if (isLoadingPermissions) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-slate-900 transition-all duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
        <span className="mr-2 text-gray-600 dark:text-gray-400">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300" dir="rtl">
      <Header onLogout={handleLogout} activeTab="sales" setActiveTab={setActiveTab} />
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} ability={ability} />
          <ContentTabs activeTab={activeTab} />
        </Tabs>
      </div>
    </div>
  );
};

export default Index;