/**
 * CloudAudit — API client: `auditLogService.ts`.
 * Typed calls to backend endpoints via `api/axiosClient`.
 */

import apiClient from "../api/axiosClient";

export type AuditLogRow = {
  audit_log_id: string;
  team_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type AuditLogsResponse = {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AuditLogsQuery = {
  page?: number;
  limit?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const auditLogService = {
  getAuditLogs: async (
    teamId: string,
    params: AuditLogsQuery = {},
  ): Promise<AuditLogsResponse> => {
    const { data } = await apiClient.get(`/teams/${teamId}/audit-logs`, {
      params,
    });
    return data;
  },
};
