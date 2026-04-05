/**
 * CloudAudit — React hook: `useAnomaly`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anomalyService } from "~/services/anomalyService";
import { recommendationsQueryKey } from "~/hooks/useRecommendations";

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

      // Sidebar + recommendations page: new recs may be created by the same pipeline
      queryClient.invalidateQueries({
        queryKey: recommendationsQueryKey(variables.teamId, variables.accId),
      });

      // Also refresh the team notifications dropdown (ML analysis events)
      queryClient.invalidateQueries({
        queryKey: ["teamNotifications", variables.teamId],
      });
    },
  });
};

export const useDismissAnomaly = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      accId,
      anomalyId,
      note,
    }: {
      teamId: string;
      accId: string;
      anomalyId: string;
      note?: string;
    }) => anomalyService.dismissAnomaly(teamId, accId, anomalyId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["anomalies", variables.teamId, variables.accId],
      });
    },
  });
};

export const useResolveAnomaly = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      teamId,
      accId,
      anomalyId,
      note,
    }: {
      teamId: string;
      accId: string;
      anomalyId: string;
      note?: string;
    }) => anomalyService.resolveAnomaly(teamId, accId, anomalyId, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["anomalies", variables.teamId, variables.accId],
      });
    },
  });
};
