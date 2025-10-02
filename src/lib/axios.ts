import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: "https://pos-nova.infinityfree.me",
  withCredentials: true,
  headers: {
    "Accept": "application/json",
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
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


export default api;
