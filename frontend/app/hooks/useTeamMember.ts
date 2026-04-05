/**
 * CloudAudit — React hook: `useTeamMember`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamMemberService } from "~/services/teamMemberService";

export const useGetTeamMemberByUserId = (teamId: string) => {
  return useQuery({
    queryKey: ["teamMember", teamId],
    queryFn: () => teamMemberService.getTeamMemberByUserId(teamId),
  });
};

export const useUpdateMyAnalysisNotifications = (teamId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      notify_analysis_email?: boolean;
      analysis_prefs_prompted?: boolean;
    }) => teamMemberService.updateMyAnalysisNotifications(teamId!, body),
    onSuccess: () => {
      if (!teamId) return;
      queryClient.invalidateQueries({ queryKey: ["workspace-team-data", teamId] });
      queryClient.invalidateQueries({ queryKey: ["teamMember", teamId] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
};
