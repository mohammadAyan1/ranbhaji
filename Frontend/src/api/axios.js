import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isPublicPath =
        window.location.pathname === "/admin/today-work/assign-delivery" ||
        window.location.pathname === "/assign-delivery" ||
        window.location.pathname === "/log-purchase" ||
        (window.location.pathname === "/admin/products" && window.location.search.includes("tab=purchase"));

      if (!isPublicPath) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
