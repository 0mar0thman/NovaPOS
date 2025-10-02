// components/AuthGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAbility } from "@casl/react";
import { AbilityContext } from "@/config/ability";
import { Loader2 } from "lucide-react";
import { useUser } from "@/components/dashboard/UserContext";

interface AuthGuardProps {
  children: React.ReactNode;
  action?: string;
  subject?: string;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  action,
  subject,
  fallback,
}) => {
  const token = localStorage.getItem("auth_token");
  const location = useLocation();
  const ability = useAbility(AbilityContext);
  const { currentUser } = useUser();

  // ✅ تحقق آمن من وجود التوكن
  if (!token || token === "undefined" || token === "null") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ تحميل بيانات المستخدم
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            جاري تحميل بيانات المستخدم...
          </p>
        </div>
      </div>
    );
  }

  // ✅ التحقق من الصلاحيات
  if (action && subject && !ability.can(action as any, subject as any)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            غير مصرح بالوصول
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            ليس لديك الصلاحية للوصول إلى هذه الصفحة
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            العودة للخلف
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;