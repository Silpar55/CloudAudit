/**
 * CloudAudit — React hook: `useWorkspaceTeamData`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useQuery } from "@tanstack/react-query";
import { authService } from "~/services/authService";
import { teamMemberService } from "~/services/teamMemberService";
import { teamService } from "~/services/teamService";

export const useWorkspaceTeamData = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ["workspace-team-data", teamId],
    queryFn: async () => {
      const [user, team, teamMember] = await Promise.all([
        authService.getMe(),
        teamService.getTeamById(teamId!),
        teamMemberService.getTeamMemberByUserId(teamId!),
      ]);

      return { user, team, teamMember };
    },
    enabled: !!teamId, // prevents running if teamId is undefined
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
  });
};
