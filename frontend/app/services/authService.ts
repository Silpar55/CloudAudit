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
};
