import { create } from "zustand";
import api from "../api/axios";

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || null,
  isLoading: false,

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      localStorage.setItem("token", data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return data.user;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/register", formData);
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyRegistrationOTP: async (phone, otp) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/verify-registration-otp", { phone, otp });
      localStorage.setItem("token", data.token);
      set({ user: data.user, token: data.token, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resendOTP: async (phone) => {
    try {
      const { data } = await api.post("/auth/resend-otp", { phone });
      return data;
    } catch (error) {
      throw error;
    }
  },

  forgotPassword: async (phone) => {
    try {
      const { data } = await api.post("/auth/forgot-password", { phone });
      return data;
    } catch (error) {
      throw error;
    }
  },

  verifyForgotPasswordOTP: async (phone, otp) => {
    try {
      const { data } = await api.post("/auth/verify-forgot-password-otp", { phone, otp });
      return data;
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/reset-password", payload);
      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
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
