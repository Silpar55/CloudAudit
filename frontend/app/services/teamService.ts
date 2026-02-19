import apiClient from "../api/axiosClient";

export const teamService = {
  createTeam: async (teamData: any) => {
    const response = await apiClient.post("/teams", teamData);
    return response.data;
  },

  getTeamsByUserId: async () => {
    const response = await apiClient.get("/teams");
    return response.data;
  },
  getTeamById: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}`);
    return response.data;
  },
};
