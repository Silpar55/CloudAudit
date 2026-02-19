import { useMutation, useQueryClient } from "@tanstack/react-query";
import { awsService } from "~/services/awsService";

export const useProvisionAwsAccount = () => {
  return useMutation({
    mutationFn: ({ teamId, roleArn }: { teamId: string; roleArn: string }) =>
      awsService.provisionAccount(teamId, roleArn),
  });
};

export const useActivateAwsAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, roleArn }: { teamId: string; roleArn: string }) =>
      awsService.activateAccount(teamId, roleArn),
    onSuccess: (_, variables) => {
      // Refetch the team data. Since the backend marked it as 'active',
      // the UI will automatically drop the setup form and show the dashboard.
      queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ["userTeams"] });
    },
  });
};
