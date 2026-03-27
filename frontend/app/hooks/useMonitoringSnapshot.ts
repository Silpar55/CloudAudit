import { useQuery } from "@tanstack/react-query";
import { monitoringService } from "~/services/monitoringService";

export const useMonitoringSnapshot = () => {
  return useQuery({
    queryKey: ["monitoringSnapshot"],
    queryFn: () => monitoringService.getSnapshot(),
    refetchInterval: 15000,
    retry: false,
  });
};

