// pages/Login.tsx - الإصدار المعدل
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAppAbility, AppAbility } from "@/config/ability";
import { mapBackendPermissions } from "@/config/abilityMapper";
import { useUser } from "@/components/dashboard/UserContext";
import { authService } from "@/services/authService"; // ✅ استيراد الخدمة

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

  // ✅ تنظيف البيانات عند تحميل المكون
  // useEffect(() => {
  //   authService.clearAuthData();
  // }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ استخدام خدمة المصادقة
      const result = await authService.loginUser(email, password);

      if (result.success && result.data) {
        const { user, permissions, token } = result.data;

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
        
      } else {
        // ✅ فشل تسجيل الدخول
        toast({
          title: "فشل تسجيل الدخول",
          description: result.error || "حدث خطأ غير متوقع",
          variant: "destructive",
          className: "transition-all duration-300",
        });
      }
      
    } catch (error: any) {
      console.error("❌ خطأ غير متوقع:", error);
      
      toast({
        title: "فشل تسجيل الدخول",
        description: "حدث خطأ غير متوقع أثناء تسجيل الدخول",
        variant: "destructive",
        className: "transition-all duration-300",
      });
    } finally {
      setIsLoading(false);
    }
  };

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