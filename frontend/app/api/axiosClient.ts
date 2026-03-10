import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach the current Access Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: The Refresh Token Magic
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Silently hit the refresh endpoint. It automatically sends the HTTP-Only cookie.
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || "http://localhost:3000/api"}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        // Save the new access token
        const newToken = response.data.token;
        localStorage.setItem("token", newToken);

        // Update the failed request with the new token and retry it!
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // If the refresh token is ALSO expired, force the user to log in again
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
