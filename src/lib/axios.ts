import axios from "axios";
import Cookies from "js-cookie";

// تحديد الـ baseURL بناءً على البيئة (لو محلي أو production)
const api = axios.create({
  baseURL: "https://novapos.byethost12.com/pos/public",
  withCredentials: true,
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// إضافة الهيدر X-XSRF-TOKEN و Authorization لكل طلب
api.interceptors.request.use((config) => {
  // 1. XSRF Token
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken) {
    config.headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  // 2. JWT Auth Token
  const authToken = localStorage.getItem("auth_token");
  if (authToken) {
    config.headers["Authorization"] = `Bearer ${authToken}`;
  }

  return config;
});

export default api;
