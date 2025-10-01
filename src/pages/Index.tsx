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

  // Fetch current user and update Ability
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }
        const response = await axios.get("/api/get-user", {
          headers: { Authorization: `Bearer ${token}` },
        });

          const permissions = response.data.permissions || [];
          console.log("User permissions:", permissions);
                
          // لو المستخدم عنده manage-all → يبقى Admin
          if (permissions.includes("manage-all")) {
            ability.update(createAppAbility([{ action: "manage", subject: "All" }]).rules);
          } else {
            const rules = permissions.map((permission: string) => {
              const [action, subject] = permission.split("-");
              return { action, subject };
            });
            ability.update(createAppAbility(rules).rules);
          }
          

        // إذا لم يكن للمستخدم صلاحية الوصول إلى تبويب "sales"، قم بتغيير التبويب الافتراضي
        if (!ability.can("read", "Dashboard")) {
          if (ability.can("read", "Reports")) {
            setActiveTab("reports");
          } else {
            navigate("/unauthorized");
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch user permissions:", error.response?.data);
        if (error.response?.status === 401) {
          localStorage.removeItem("auth_token");
          navigate("/login", { replace: true });
        }
        toast({
          title: "خطأ",
          description: error.response?.data?.message || "فشل في جلب بيانات المستخدم",
          variant: "destructive",
          className: "transition-all duration-300",
        });
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    fetchCurrentUser();
  }, [navigate, ability, toast]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/login", { replace: true });
  };

  if (isLoadingPermissions) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-slate-900 transition-all duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-300"
      dir="rtl"
    >
     <Header
      onLogout={handleLogout}
      activeTab="sales"
      setActiveTab={setActiveTab}
    />
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} ability={ability} />
          <ContentTabs activeTab={activeTab}  />
        </Tabs>
      </div>
    </div>
  );
};

export default Index;