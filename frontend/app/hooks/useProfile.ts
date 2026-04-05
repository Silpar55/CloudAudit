/**
 * CloudAudit — React hook: `useProfile`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "~/services/authService";
import { profileService, type ProfilePayload } from "~/services/profileService";

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: profileService.getProfile,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProfilePayload>) =>
      profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

// NEW: Hook to handle requesting the email change
export const useRequestEmailChange = () => {
  return useMutation({
    mutationFn: (new_email: string) =>
      profileService.requestEmailChange(new_email),
  });
};

// NEW: Hook to handle verifying the email token
export const useVerifyEmailChange = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => profileService.verifyEmailChange(token),
    onSuccess: () => {
      // Refresh profile and auth data once the email is successfully changed
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: authService.changePassword,
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.deleteAccount,
    onSuccess: () => {
      queryClient.clear(); // Clear all data on deletion
    },
  });
};
