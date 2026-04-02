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

export type UserInviteCandidate = {
  user_id: string;
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

  searchInviteCandidates: async (
    teamId: string,
    emailQuery: string,
  ): Promise<UserInviteCandidate[]> => {
    const { data } = await apiClient.get(`/teams/${teamId}/members/search`, {
      params: { email: emailQuery },
    });
    return data.users ?? [];
  },

  addTeamMember: async (
    teamId: string,
    email: string,
    options?: { sendEmail?: boolean },
  ) => {
    const { data } = await apiClient.post(`/teams/${teamId}/members`, {
      email,
      sendEmail: options?.sendEmail !== false,
    });
    return data;
  },

  /** Idempotent: one reusable link per workspace (newcomer sign-up flow). */
  getOrCreateShareInvite: async (teamId: string) => {
    const { data } = await apiClient.post(`/teams/${teamId}/members/share-link`);
    return data as {
      invitationId: string;
      inviteLink: string;
      isNew: boolean;
      message: string;
    };
  },

  previewInvitation: async (token: string) => {
    const { data } = await apiClient.get(`/teams/invitations/preview`, {
      params: { token },
    });
    return data;
  },

  acceptInvitationByToken: async (token: string) => {
    const { data } = await apiClient.post(`/teams/invitations/accept`, { token });
    return data;
  },

  acceptInvitationById: async (invitationId: string) => {
    const { data } = await apiClient.post(
      `/teams/invitations/${invitationId}/accept`,
    );
    return data;
  },

  listMyInvitations: async () => {
    const { data } = await apiClient.get(`/teams/invitations`);
    return data?.invitations ?? [];
  },

  declineInvitation: async (invitationId: string) => {
    const { data } = await apiClient.post(
      `/teams/invitations/${invitationId}/decline`,
    );
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
