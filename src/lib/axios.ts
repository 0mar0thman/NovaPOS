import axios from "axios";
import Cookies from "js-cookie";


const api = axios.create({
  baseURL: "https://pos-nova.infinityfree.me",
  withCredentials: true,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});


// إضافة الهيدر X-XSRF-TOKEN يدويًا في كل طلب
api.interceptors.request.use((config) => {
  // 1. إضافة XSRF-TOKEN للحماية من CSRF
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  // 2. إضافة توكن المصادقة (JWT)
  const authToken = localStorage.getItem("auth_token");
  if (authToken) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  return config;
});

// دالة للحصول على CSRF token مع التعامل مع التحدي
// const getCsrfToken = async () => {
//   try {
//     const response = await api.get("/sanctum/c srf-cookie");
//     return true;
//   } catch (error) {
//     console.error("فشل في الحصول على CSRF token:", error);
//     return false;
//   }
// };

// // interceptor للطلبات
// api.interceptors.request.use(
//   async (config) => {
//     // التأكد من وجود CSRF token قبل أي طلب غير GET
//     if (config.method !== "get") {
//       await getCsrfToken();
//     }

//     const token = localStorage.getItem("auth_token");
//     if (token && token !== "undefined" && token !== "null") {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     // إضافة timestamp لمنع caching
//     if (config.method === "get") {
//       config.params = {
//         ...config.params,
//         _t: Date.now(),
//       };
//     }

//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // interceptor للاستجابات
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 419 || error.response?.status === 401) {
//       if (!originalRequest._retry) {
//         originalRequest._retry = true;

//         try {
//           // محاولة تجديد CSRF token
//           await getCsrfToken();
          
//           // إعادة الطلب الأصلي بعد تجديد التوكن
//           return api(originalRequest);
//         } catch (csrfError) {
//           console.error("فشل في تجديد الجلسة:", csrfError);
          
//           // تنظيف البيانات المحلية وإعادة التوجيه
//           localStorage.removeItem("auth_token");
//           localStorage.removeItem("user_data");
//           window.location.href = "/login";
//         }
//       }
//     }

//     return Promise.reject(error);
//   }
// );

export default api;