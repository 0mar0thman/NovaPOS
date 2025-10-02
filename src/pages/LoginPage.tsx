// pages/Login.tsx - الإصلاح الكامل
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAppAbility, AppAbility } from "@/config/ability";
import { mapBackendPermissions } from "@/config/abilityMapper";
import { useUser } from "@/components/dashboard/UserContext";

interface LoginProps {
  setAbility: React.Dispatch<React.SetStateAction<AppAbility>>;
}

const Login = ({ setAbility }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();

  // ✅ دالة تنظيف محسنة
  const clearAuthData = () => {
    const keys = ["auth_token", "permissions", "user_data"];
    keys.forEach(key => {
      localStorage.removeItem(key);
      // ✅ تأكد من إزالة أي قيم "undefined" نصية
      if (localStorage.getItem(key) === "undefined") {
        localStorage.removeItem(key);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // ✅ تنظيف أي بيانات قديمة قبل البدء
    clearAuthData();

    try {
      console.log("جاري الحصول على CSRF token...");
      
      // ✅ الحصول على CSRF token مع معالجة الأخطاء
      const csrfResponse = await api.get("sanctum/csrf-cookie", { 
        withCredentials: true,
        timeout: 10000
      });
      console.log("CSRF token تم الحصول عليه:", csrfResponse.status);

      console.log("جاري تسجيل الدخول...");
      const loginResponse = await api.post(
        "/api/login",
        { email, password },
        { 
          withCredentials: true,
          timeout: 15000
        }
      );

      console.log("استجابة الخادم:", loginResponse.data);

      // ✅ تحقق قوي من صحة الاستجابة
      if (!loginResponse.data) {
        throw new Error("لا توجد بيانات في استجابة الخادم");
      }

      const { token, permissions, user } = loginResponse.data;

      // ✅ تحقق من وجود التوكن والمستخدم
      if (!token || token === "undefined" || token === "null") {
        throw new Error("توكن المصادقة غير صالح");
      }

      if (!user) {
        throw new Error("بيانات المستخدم غير متوفرة");
      }

      // ✅ حفظ البيانات مع التحقق
      if (token && token !== "undefined") {
        localStorage.setItem("auth_token", token);
        console.log("تم حفظ التوكن:", token.substring(0, 20) + "...");
      }

      if (permissions && Array.isArray(permissions)) {
        localStorage.setItem("permissions", JSON.stringify(permissions));
        console.log("تم حفظ الصلاحيات:", permissions);
      }

      // ✅ حفظ بيانات المستخدم في context
      setCurrentUser({
        id: user.id,
        name: user.name || "مستخدم",
        email: user.email,
        roles: user.role || "user",
      });

      // ✅ تحويل الصلاحيات وتحديث ability
      const rules = mapBackendPermissions(permissions || []);
      setAbility(createAppAbility(rules));

      toast({
        title: "تم تسجيل الدخول بنجاح ✅",
        description: `مرحباً ${user.name || user.email}`,
        className: "transition-all duration-300",
      });
      
      // ✅ الانتقال للصفحة الرئيسية
      navigate("/", { replace: true });
      
    } catch (error: any) {
      console.error("خطأ تسجيل الدخول:", error);
      
      // ✅ تنظيف البيانات في حالة الخطأ
      clearAuthData();
      
      let errorMessage = "حدث خطأ غير متوقع";
      
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
        errorMessage = "مشكلة في الاتصال بالخادم. تحقق من اتصال الإنترنت.";
      } else if (error.response?.status === 401) {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (error.response?.status === 422) {
        errorMessage = "بيانات الدخول غير صالحة";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "فشل تسجيل الدخول",
        description: errorMessage,
        variant: "destructive",
        className: "transition-all duration-300",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ تنظيف البيانات عند تحميل المكون
  useState(() => {
    clearAuthData();
  });

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-blue-200 dark:from-slate-900 dark:to-slate-800 transition-all duration-300" dir="rtl">
      <Card className="w-full max-w-md bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-blue-100 dark:border-slate-700 shadow-xl rounded-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center text-blue-800 dark:text-blue-300 transition-all duration-300">
            تسجيل الدخول
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
            />
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg transition-all duration-300"
            >
              {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;