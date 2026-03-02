import apiClient from "../api/axiosClient";

export const authService = {
  signUp: async (userData: any) => {
    const response = await apiClient.post("/auth/signup", userData);
    return response.data;
  },

  login: async (credentials: any) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data?.user ?? null;
  },

  verifyEmail: async (token: string) => {
    const response = await apiClient.post("/auth/verify-email", { token });
    return response.data;
  },

  requestPasswordReset: async (email: string) => {
    const response = await apiClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (data: { token: string; newPassword: string }) => {
    const response = await apiClient.post("/auth/reset-password", data);
    return response.data;
  },

  changePassword: async (data: any) => {
    const response = await apiClient.patch("/auth/password", data);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete("/auth/account");
    return response.data;
  },
};
