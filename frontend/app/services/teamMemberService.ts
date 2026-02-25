import apiClient from "../api/axiosClient";

export const teamMemberService = {
  getTeamMemberByUserId: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/members`);
    return response.data?.teamMember ?? null;
  },
};
