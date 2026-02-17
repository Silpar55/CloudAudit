import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";

export const useSignUp = () => {
  return useMutation({
    mutationFn: authService.signUp,
    onSuccess: (data: any) => {
      return data;
    },
    onError: (error: any) => {
      console.error("Sign up failed:", error.response?.data?.message);
    },
  });
};
