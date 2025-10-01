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

const api = axios.create({
  baseURL: "/api", // أو "/" إذا كنت تستخدم Vercel proxy
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // إضافة timestamp لمنع caching
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
      // محاولة تجديد CSRF token
      try {
        await axios.get(
          "https://novapos.byethost12.com/pos/public/sanctum/csrf-cookie",
          { 
            withCredentials: true,
            params: { _t: Date.now() }
          }
        );
      } catch (csrfError) {
        console.error("فشل في الحصول على CSRF token:", csrfError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;