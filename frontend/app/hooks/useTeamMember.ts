import { useQuery } from "@tanstack/react-query";
import { teamMemberService } from "~/services/teamMemberService";

export const useGetTeamMemberByUserId = (teamId: string) => {
  return useQuery({
    queryKey: ["teamMember", teamId],
    queryFn: () => teamMemberService.getTeamMemberByUserId(teamId),
  });
};
