/**
 * CloudAudit — API client: `monitoringService.ts`.
 * Typed calls to backend endpoints via `api/axiosClient`.
 */

import apiClient from "~/api/axiosClient";

export interface MonitoringSnapshot {
  status: "healthy" | "degraded";
  generatedAt: number;
  dependencies: {
    database: string;
    awsCredentials: string;
    mlService: string;
  };
  metrics: {
    uptimeSec: number;
    startedAt: number;
    requests: {
      total: number;
      lastMinute: number;
    };
    errors: {
      total: number;
      errorRatePct: number;
      lastMinute: number;
      lastMinuteErrorRatePct: number;
    };
    latency: {
      avgMs: number;
      p95Ms: number;
    };
    topRoutes: Array<{
      route: string;
      requests: number;
      errorRatePct: number;
      avgLatencyMs: number;
    }>;
  };
}

export const monitoringService = {
  getSnapshot: async (): Promise<MonitoringSnapshot> => {
    const response = await apiClient.get("/health/monitoring");
    return response.data;
  },
};

