import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAppAbility, AppAbility } from "@/config/ability";
import { mapBackendPermissions } from "@/config/abilityMapper";

interface LoginProps {
  setAbility: React.Dispatch<React.SetStateAction<AppAbility>>;
}

const Login = ({ setAbility }: LoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.get("sanctum/csrf-cookie", { withCredentials: true });

      const res = await api.post(
        "/api/login",
        { email, password },
        { withCredentials: true }
      );
      const { token, permissions } = res.data;

      // حفظ التوكن
      localStorage.setItem("auth_token", token);

      // تحويل صلاحيات الباك إلى قواعد CASL
      const rules = mapBackendPermissions(permissions);

      // تحديث الـ Ability
      setAbility(createAppAbility(rules));

      toast({
        title: "تم تسجيل الدخول بنجاح ✅",
        className: "transition-all duration-300",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error?.response?.data?.message || "بيانات غير صحيحة",
        variant: "destructive",
        className: "transition-all duration-300",
      });
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-blue-200 dark:from-slate-900 dark:to-slate-800 transition-all duration-300"
      dir="rtl"
    >
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
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-lg transition-all duration-300"
            >
              دخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
