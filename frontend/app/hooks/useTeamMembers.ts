/**
 * CloudAudit — React hook: `useTeamMembers`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  teamMemberService,
  type TeamMemberRow,
  type UserInviteCandidate,
} from "../services/teamMemberService";

export const useTeamMembers = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => teamMemberService.listTeamMembers(teamId!),
    enabled: !!teamId,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["workspace-team-data", teamId] });
  };

  const addMember = useMutation({
    mutationFn: (vars: { email: string; sendEmail?: boolean }) =>
      teamMemberService.addTeamMember(teamId!, vars.email, {
        sendEmail: vars.sendEmail,
      }),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      teamMemberService.removeTeamMember(teamId!, userId),
    onSuccess: invalidate,
  });

  const updateRole = useMutation({
    mutationFn: ({
      userId,
      newRole,
    }: {
      userId: string;
      newRole: string;
    }) => teamMemberService.updateMemberRole(teamId!, userId, newRole),
    onSuccess: invalidate,
  });

  const searchInviteCandidates = useCallback(
    (emailQuery: string) =>
      teamMemberService.searchInviteCandidates(teamId!, emailQuery) as Promise<
        UserInviteCandidate[]
      >,
    [teamId],
  );

  return {
    members: (listQuery.data ?? []) as TeamMemberRow[],
    searchInviteCandidates,
    loading: listQuery.isLoading,
    error: listQuery.error,
    refetch: listQuery.refetch,
    addMember,
    removeMember,
    updateRole,
  };
};
