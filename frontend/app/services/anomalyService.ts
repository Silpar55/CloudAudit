import apiClient from "../api/axiosClient";

export const anomalyService = {
  getAnomalies: async (teamId: string, accId: string) => {
    const response = await apiClient.get(
      `/teams/${teamId}/aws-accounts/${accId}/anomalies`,
    );
    return response.data.anomalies;
  },

  triggerAnalysis: async (teamId: string, accId: string) => {
    const response = await apiClient.post(
      `/teams/${teamId}/aws-accounts/${accId}/anomalies/analyze`,
    );

    console.log(response);
    return response.data;
  },
};
