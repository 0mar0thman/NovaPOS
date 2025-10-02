// services/authService.ts
import api from "@/lib/axios";

export interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: any;
    permissions?: any[];
  };
  error?: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export const authService = {
  async loginUser(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log("🔄 جاري الحصول على CSRF token...");
      
      // الحصول على CSRF token أولاً
      await api.get("/sanctum/csrf-cookie", {
        withCredentials: true,
        timeout: 10000
      });
      
      console.log("✅ CSRF token تم الحصول عليه");

      console.log("🔄 جاري تسجيل الدخول...");
      const response = await api.post("/api/login", {
        email,
        password
      }, {
        withCredentials: true,
        timeout: 15000
      });

      console.log("📨 استجابة الخادم:", response.data);

      if (response.data.token) {
        // حفظ التوكن في localStorage
        localStorage.setItem("auth_token", response.data.token);
        
        // الحصول على بيانات المستخدم إذا لم تكن موجودة في الاستجابة
        let userData = response.data.user;
        if (!userData) {
          console.log("🔄 جاري جلب بيانات المستخدم...");
          const userResponse = await api.get("/api/user");
          userData = userResponse.data;
        }
        
        // حفظ بيانات المستخدم
        localStorage.setItem("user_data", JSON.stringify(userData));
        
        return { 
          success: true, 
          data: {
            token: response.data.token,
            user: userData,
            permissions: response.data.permissions || []
          }
        };
      }

      return { success: false, error: "فشل تسجيل الدخول - لا يوجد توكن" };
    } catch (error: any) {
      console.error("❌ خطأ في تسجيل الدخول:", error);
      
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
      
      return { success: false, error: errorMessage };
    }
  },

  async logoutUser(): Promise<void> {
    try {
      await api.post("/api/logout", {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    } finally {
      // تنظيف البيانات المحلية في جميع الأحوال
      this.clearAuthData();
    }
  },

  clearAuthData(): void {
    const keys = ["auth_token", "permissions", "user_data"];
    keys.forEach(key => {
      localStorage.removeItem(key);
      if (localStorage.getItem(key) === "undefined") {
        localStorage.removeItem(key);
      }
    });
  },

  getCurrentUser(): UserData | null {
    try {
      const userData = localStorage.getItem("user_data");
      if (userData && userData !== "undefined") {
        return JSON.parse(userData);
      }
      return null;
    } catch {
      return null;
    }
  },

  getAuthToken(): string | null {
    const token = localStorage.getItem("auth_token");
    return token && token !== "undefined" ? token : null;
  }
};