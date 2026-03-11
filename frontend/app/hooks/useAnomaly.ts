import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anomalyService } from "~/services/anomalyService";

export const useGetAnomalies = (teamId?: string, accId?: string) => {
  return useQuery({
    queryKey: ["anomalies", teamId, accId],
    queryFn: () => anomalyService.getAnomalies(teamId!, accId!),
    enabled: !!teamId && !!accId,
  });
};

export const useTriggerAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, accId }: { teamId: string; accId: string }) =>
      anomalyService.triggerAnalysis(teamId, accId),
    onSuccess: (_, variables) => {
      // Instantly refresh the anomalies list anywhere in the app when ML finishes
      queryClient.invalidateQueries({
        queryKey: ["anomalies", variables.teamId, variables.accId],
      });
    },
  });
};
