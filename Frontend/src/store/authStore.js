import { create } from "zustand";
import api from "../api/axios";

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  isLoading: false,

  login: async (phone, password) => {
    set({ isLoading: true });
    const { data } = await api.post("/auth/login", { phone, password });
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token, isLoading: false });
    return data.user;
  },

  register: async (formData) => {
    set({ isLoading: true });
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("token", data.token);
    set({ user: data.user, token: data.token, isLoading: false });
    return data.user;
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem("token");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
    api.post("/auth/logout").catch(() => {});
  },

  setLoading: (v) => set({ isLoading: v }),
}));

export default useAuthStore;
