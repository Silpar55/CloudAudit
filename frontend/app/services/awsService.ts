import apiClient from "../api/axiosClient";

export const awsService = {
  provisionAccount: async (teamId: string, roleArn: string) => {
    const response = await apiClient.post(
      `/teams/${teamId}/aws-accounts/provision`,
      { roleArn },
    );
    return response.data;
  },

  activateAccount: async (teamId: string, roleArn: string) => {
    const response = await apiClient.post(
      `/teams/${teamId}/aws-accounts/activate`,
      { roleArn },
    );
    return response.data;
  },
};
