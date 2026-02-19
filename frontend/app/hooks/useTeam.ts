import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

type Team = {
  team_id: string;
  name: string;
  description: string | null;
  status: string;
  member_count: number;
  aws_account_id: string | null;
  aws_status: string | null;
  monthly_cost: number | null;
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teamService.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
};

export const useGetTeamsByUserId = () => {
  return useQuery({
    queryKey: ["userTeams"],
    queryFn: teamService.getTeamsByUserId,
  });
};

export const useGetTeamById = (teamId?: string, options = {}) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: () => teamService.getTeamById(teamId!),
    enabled: !!teamId,
    initialData: () => {
      const data = queryClient.getQueryData<{ teams: Team[] }>(["userTeams"]);

      if (!data) return undefined;

      const team = data.teams.find((t) => t.team_id === teamId);

      if (!team) return undefined;

      return { team };
    },
    ...options,
  });
};
