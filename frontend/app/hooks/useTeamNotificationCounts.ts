import { useQuery } from "@tanstack/react-query";
import { notificationService } from "~/services/notificationService";

export const useTeamNotificationCounts = () => {
  return useQuery({
    queryKey: ["teamNotificationCounts"],
    queryFn: () => notificationService.getTeamNotificationCounts(),
    retry: false,
  });
};

