import apiClient from "../api/axiosClient";

export type TeamMemberRow = {
  team_member_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string;
  first_name: string;
  last_name: string;
};

export const teamMemberService = {
  getTeamMemberByUserId: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/members`);
    return response.data?.teamMember ?? null;
  },

  listTeamMembers: async (teamId: string): Promise<TeamMemberRow[]> => {
    const { data } = await apiClient.get(`/teams/${teamId}/members/list`);
    return data.members ?? [];
  },

  addTeamMember: async (teamId: string, email: string) => {
    const { data } = await apiClient.post(`/teams/${teamId}/members`, {
      email,
    });
    return data;
  },

  removeTeamMember: async (teamId: string, userId: string) => {
    const { data } = await apiClient.delete(
      `/teams/${teamId}/members/${userId}`,
    );
    return data;
  },

  updateMemberRole: async (
    teamId: string,
    userId: string,
    newRole: string,
  ) => {
    const { data } = await apiClient.patch(
      `/teams/${teamId}/members/${userId}`,
      { newRole },
    );
    return data;
  },
};
