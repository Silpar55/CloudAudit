/**
 * CloudAudit — API client: `recommendationsService.ts`.
 * Typed calls to backend endpoints via `api/axiosClient`.
 */

import apiClient from "../api/axiosClient";

export interface RecommendationMetadata {
  avg_cpu?: number;
  peak_network_mbps?: number;
  connection_count?: number;
  lookback_days?: number;
  avg_network_mb?: number;
  avg_connections?: number;
  max_connections?: number;
  previous_instance_class?: string;
  ai_generated?: boolean;
  cur_inferred?: boolean;
}

/** Returned from POST .../implement — use for success modal + console deep links */
export interface ImplementationSummary {
  kind: "ec2_stop" | "rds_modify" | "skipped_no_credentials";
  headline: string;
  detail: string;
  consoleUrl: string | null;
  region: string;
  resourceId: string;
}

export interface Recommendation {
  recommendation_id: string;
  aws_account_id: string;
  resource_id: string;
  resource_type: "ec2_instance" | "rds_instance" | "s3_bucket" | "other";
  anomaly_id: string | null;
  recommendation_type: string;
  description: string;
  estimated_monthly_savings: string | number;
  confidence_score: string | number;
  confidence_score_pct: string;
  status: "pending" | "implemented" | "rolled_back" | "dismissed";
  metadata: RecommendationMetadata | string;
  resolution_type: "automated" | "manual";
  action_steps?: string[];
  resource_type_display?: string;
  created_at: string;
}

export const recommendationService = {
  getRecommendations: async (
    teamId: string,
    accountId: string,
  ): Promise<Recommendation[]> => {
    const { data } = await apiClient.get(
      `/teams/${teamId}/aws-accounts/${accountId}/recommendations`,
    );
    return data.recommendations;
  },
  generateRecommendations: async (teamId: string, accountId: string) => {
    const { data } = await apiClient.post(
      `/teams/${teamId}/aws-accounts/${accountId}/recommendations/generate`,
    );
    return data;
  },
  implementRecommendation: async (
    teamId: string,
    accountId: string,
    recId: string,
  ) => {
    const { data } = await apiClient.post(
      `/teams/${teamId}/aws-accounts/${accountId}/recommendations/${recId}/implement`,
    );
    return data;
  },
  resolveRecommendation: async (
    teamId: string,
    accountId: string,
    recId: string,
  ) => {
    const { data } = await apiClient.patch(
      `/teams/${teamId}/aws-accounts/${accountId}/recommendations/${recId}/resolve`,
    );
    return data;
  },
  dismissRecommendation: async (
    teamId: string,
    accountId: string,
    recId: string,
  ) => {
    const { data } = await apiClient.patch(
      `/teams/${teamId}/aws-accounts/${accountId}/recommendations/${recId}/dismiss`,
    );
    return data;
  },
};
