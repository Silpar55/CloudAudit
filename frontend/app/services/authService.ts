import apiClient from "../api/axiosClient";

export const authService = {
  signUp: async (userData: any) => {
    // userData could be { email, password, name }
    const response = await apiClient.post("/auth/signup", userData);
    return response.data;
  },

  // easy to add more later...
  login: async (credentials: any) => {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  },
};
