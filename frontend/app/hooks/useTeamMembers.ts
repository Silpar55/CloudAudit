import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  teamMemberService,
  type TeamMemberRow,
} from "../services/teamMemberService";

export const useTeamMembers = (teamId: string | undefined) => {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => teamMemberService.listTeamMembers(teamId!),
    enabled: !!teamId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["teamMembers", teamId] });
    queryClient.invalidateQueries({ queryKey: ["workspace-team-data", teamId] });
  };

  const addMember = useMutation({
    mutationFn: (email: string) => teamMemberService.addTeamMember(teamId!, email),
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

  return {
    members: (listQuery.data ?? []) as TeamMemberRow[],
    loading: listQuery.isLoading,
    error: listQuery.error,
    refetch: listQuery.refetch,
    addMember,
    removeMember,
    updateRole,
  };
};
