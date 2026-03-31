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

    // Production-friendly: analysis may be async (202) to avoid gateway timeouts.
    if (response.status === 202) {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const startedAt = Date.now();
      while (Date.now() - startedAt < 2 * 60 * 1000) {
        await sleep(2000);
        const s = await apiClient.get(
          `/teams/${teamId}/aws-accounts/${accId}/anomalies/analyze/status`,
        );
        const state = s.data?.state;
        if (state === "completed") return s.data?.result ?? response.data;
        if (state === "failed") {
          throw new Error(s.data?.error || "AI Analysis is currently unavailable.");
        }
      }
      throw new Error("Analysis is taking longer than expected. Please try again.");
    }

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
