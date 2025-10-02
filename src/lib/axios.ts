// import axios from "axios";
// import Cookies from "js-cookie";

// // تحديد الـ baseURL بناءً على البيئة (لو محلي أو production)
// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
//   withCredentials: true,
//   headers: {
//     "Accept": "application/json",
//     "Content-Type": "application/json",
//     "X-Requested-With": "XMLHttpRequest",
//   },
// });

// // إضافة الهيدر X-XSRF-TOKEN و Authorization لكل طلب
// api.interceptors.request.use((config) => {
//   // 1. XSRF Token
//   const xsrfToken = Cookies.get("XSRF-TOKEN");
//   if (xsrfToken) {
//     config.headers["X-XSRF-TOKEN"] = xsrfToken;
//   }

//   // 2. JWT Auth Token
//   const authToken = localStorage.getItem("auth_token");
//   if (authToken) {
//     config.headers["Authorization"] = `Bearer ${authToken}`;
//   }

//   return config;
// });

// export default api;


import axios from "axios";

// تحديد baseURL بناءً على البيئة
const getBaseURL = () => {
  // في التطوير: استخدام الرابط المباشر
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  }
  // في الإنتاج: استخدام المسارات النسبية للبروكسي
  return "/";
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
  },
});

// interceptor للطلبات
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // إضافة timestamp لمنع caching (فقط للطلبات GET)
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// interceptor للاستجابات
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 419 || error.response?.status === 401) {
      // محاولة تجديد CSRF token باستخدام المسار النسبي
      try {
        await api.get("/sanctum/csrf-cookie");
      } catch (csrfError) {
        console.error("فشل في الحصول على CSRF token:", csrfError);
      }
      
      // تنظيف البيانات المحلية وإعادة التوجيه
      localStorage.removeItem("auth_token");
      localStorage.removeItem("permissions");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;