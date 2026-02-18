import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";

export const useSignUp = () => {
  return useMutation({
    mutationFn: authService.signUp,
  });
};

export const useLogin = () => {
  return useMutation({
    mutationFn: authService.login,
  });
};
