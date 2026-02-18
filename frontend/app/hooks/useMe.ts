import { useQuery } from "@tanstack/react-query";
import { authService } from "~/services/authService";

export const useMe = (enabled: boolean = false) => {
  return useQuery({
    queryKey: ["me"],
    queryFn: authService.getMe,
    retry: false,
    enabled: enabled,
  });
};
