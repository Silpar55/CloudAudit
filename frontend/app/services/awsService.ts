/**
 * CloudAudit — API client: `awsService.ts`.
 * Typed calls to backend endpoints via `api/axiosClient`.
 */

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

  /**
   * Fetch the AWS account record for a team.
   * Returns the full row from aws_accounts (including the internal UUID `id`
   * and the 12-digit `aws_account_id`).
   */
  getAwsAccount: async (teamId: string) => {
    const response = await apiClient.get(`/teams/${teamId}/aws-accounts`);
    return response.data;
  },

  /**
   * Trigger the Cost Explorer sync and return cached rows.
   * Uses the internal UUID (`accId`) that lives in cost_explorer_cache.aws_account_id.
   *
   * @param teamId   - Team UUID
   * @param accId    - Internal aws_accounts.id (UUID), NOT the 12-digit AWS account ID
   * @param startDate - YYYY-MM-DD
   * @param endDate   - YYYY-MM-DD
   */
  getCostAndUsage: async (
    teamId: string,
    accId: string,
    startDate: string,
    endDate: string,
  ) => {
    const response = await apiClient.get(
      `/teams/${teamId}/aws-accounts/ce/cost-usage/${accId}`,
      { params: { startDate, endDate } },
    );
    return response.data;
  },

  checkCurStatus: async (teamId: string, accId: string) => {
    const response = await apiClient.get(
      `/teams/${teamId}/aws-accounts/cur/status/${accId}`,
    );
    return response.data; // { status: "active" | "pending" }
  },

  syncCurData: async (teamId: string, accId: string) => {
    const response = await apiClient.post(
      `/teams/${teamId}/aws-accounts/cur/sync/${accId}`,
    );
    return response.data;
  },

  /**
   * Fetch the cached cost explorer rows directly from the DB-backed endpoint.
   * Used for display after a sync has been triggered.
   *
   * @param teamId  - Team UUID
   * @param accId   - Internal aws_accounts.id (UUID)
   * @param startDate - YYYY-MM-DD
   * @param endDate   - YYYY-MM-DD
   */
  getCachedCostData: async (
    teamId: string,
    accId: string,
    startDate: string,
    endDate: string,
  ) => {
    const response = await apiClient.get(
      `/teams/${teamId}/aws-accounts/ce/cost-usage/${accId}/cached`,
      { params: { startDate, endDate } },
    );
    return response.data;
  },
};
