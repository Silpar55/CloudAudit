import { useQuery } from "@tanstack/react-query";
import { notificationService } from "~/services/notificationService";

export const useTeamNotifications = (
  teamId: string | undefined,
  options?: { enabled?: boolean; limit?: number; page?: number },
) => {
  const enabled = options?.enabled ?? true;
  const limit = options?.limit ?? 5;
  const page = options?.page ?? 1;

  return useQuery({
    queryKey: ["teamNotifications", teamId, { page, limit }],
    queryFn: () =>
      notificationService.getTeamNotifications(teamId!, { page, limit }),
    enabled: !!teamId && enabled,
    retry: false,
  });
};

