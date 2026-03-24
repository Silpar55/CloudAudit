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
      `/teams/${teamId}/aws-accounts/${accId}/anomalies/analyze?version=2`,
    );

    console.log(response.data);
    return response.data;
  },

  dismissAnomaly: async (
    teamId: string,
    accId: string,
    anomalyId: string,
    note?: string,
  ) => {
    const response = await apiClient.patch(
      `/teams/${teamId}/aws-accounts/${accId}/anomalies/${anomalyId}/dismiss`,
      { note },
    );
    return response.data;
  },

  resolveAnomaly: async (
    teamId: string,
    accId: string,
    anomalyId: string,
    note?: string,
  ) => {
    const response = await apiClient.patch(
      `/teams/${teamId}/aws-accounts/${accId}/anomalies/${anomalyId}/resolve`,
      { note },
    );
    return response.data;
  },
};
