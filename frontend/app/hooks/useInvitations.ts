/**
 * CloudAudit — React hook: `useInvitations`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamMemberService } from "~/services/teamMemberService";

export type PendingInvitation = {
  invitation_id: string;
  team_id: string;
  team_name: string;
  team_description: string | null;
  invited_email: string;
  invited_by: string;
  invited_by_email: string | null;
  invited_by_first_name: string | null;
  invited_by_last_name: string | null;
  created_at: string;
  expires_at: string | null;
};

export const useMyInvitations = () => {
  return useQuery({
    queryKey: ["myInvitations"],
    queryFn: () => teamMemberService.listMyInvitations(),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
  });
};

export const useAcceptInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      teamMemberService.acceptInvitationById(invitationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["myInvitations"] });
      await qc.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
};

export const useDeclineInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      teamMemberService.declineInvitation(invitationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myInvitations"] });
    },
  });
};

