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

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: authService.verifyEmail,
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: authService.requestPasswordReset,
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: authService.resetPassword,
  });
};
