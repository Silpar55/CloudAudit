import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";

export const useSignUp = () => {
  return useMutation({
    mutationFn: authService.signUp,
    onSuccess: (data: any) => {
      console.log("User registered successfully", data);
      return data;
    },
    onError: (error: any) => {
      console.error("Sign up failed:", error.response?.data?.message);
    },
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data: any) => {
      console.log("Login successfully", data);
      return data;
    },
    onError: (error: any) => {
      console.error("Sign up failed:", error.response?.data?.message);
    },
  });
};
