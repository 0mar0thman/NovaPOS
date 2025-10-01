import axios from "axios";
import Cookies from "js-cookie";

// تحديد الـ baseURL (بدون /public)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
  withCredentials: true, // مهم عشان الكوكيز تتبعت
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// إضافة الهيدر X-XSRF-TOKEN و Authorization لكل طلب
api.interceptors.request.use((config) => {
  // 1. XSRF Token من الكوكيز
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken) {
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken); 
    // decodeURIComponent مهم عشان الكوكيز بيبقى معمول له encode
  }

  // 2. JWT Auth Token (لو انت مستخدم التوكنات)
  const authToken = localStorage.getItem("auth_token");
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

export default api;
