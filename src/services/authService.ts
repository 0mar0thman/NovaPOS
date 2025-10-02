// services/authService.ts - الإصدار المعدل
import api from "@/lib/axios";

export const authService = {
  async loginUser(email: string, password: string) {
    try {
      console.log("🔄 جاري تجاوز تحدي الأمان...");
      
      // محاولة 1: استخدام fetch مباشرة مع إعدادات مختلفة
      const loginResult = await this.bypassSecurityChallenge(email, password);
      
      if (loginResult.success) {
        return loginResult;
      }
      
      // محاولة 2: استخدام axios مع إعدادات مختلفة
      return await this.alternativeLoginApproach(email, password);
      
    } catch (error) {
      console.error("❌ فشل في تجاوز تحدي الأمان:", error);
      return { 
        success: false, 
        error: "تعذر الاتصال بالخادم بسبب إعدادات الأمان" 
      };
    }
  },

  async bypassSecurityChallenge(email: string, password: string) {
    try {
      // استخدام fetch مباشرة مع إعدادات محاكية للمتصفح
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*",
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        body: JSON.stringify({ email, password })
      });

      const responseText = await response.text();
      
      // محاولة تحليل الاستجابة
      try {
        const data = JSON.parse(responseText);
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
          return { success: true, data };
        }
      } catch {
        // إذا فشل التحويل JSON، قد يكون هناك تحدي أمان
        console.warn("⚠️ الاستجابة ليست JSON:", responseText.substring(0, 200));
      }

      return { success: false, error: "تحدي أمان" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async alternativeLoginApproach(email: string, password: string) {
    try {
      // محاولة مع إعدادات axios مختلفة
      const response = await api.post("/api/login", 
        { email, password },
        {
          headers: {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest"
          },
          transformRequest: [(data) => JSON.stringify(data)],
          transformResponse: [(data) => {
            try {
              return JSON.parse(data);
            } catch {
              return data;
            }
          }]
        }
      );

      if (response.data.token) {
        localStorage.setItem("auth_token", response.data.token);
        return { success: true, data: response.data };
      }

      return { success: false, error: "لا يوجد توكن في الاستجابة" };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  }
};