/**
 * CloudAudit — React hook: `useAuth`.
 * Encapsulates data fetching or UI state for consuming components.
 */

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

export const useResendVerificationEmail = () => {
  return useMutation({
    mutationFn: authService.resendVerificationEmail,
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: authService.verifyEmail,
    retry: false,
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
