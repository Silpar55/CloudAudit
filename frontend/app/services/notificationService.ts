/**
 * CloudAudit — API client: `notificationService.ts`.
 * Typed calls to backend endpoints via `api/axiosClient`.
 */

import apiClient from "../api/axiosClient";

export type TeamNotificationRow = {
  audit_log_id: string;
  team_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_read: boolean;
  is_dismissed: boolean;
};

export type TeamNotificationsResponse = {
  logs: TeamNotificationRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const notificationService = {
  getTeamNotifications: async (
    teamId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<TeamNotificationsResponse> => {
    const { data } = await apiClient.get(`/teams/${teamId}/notifications`, {
      params,
    });
    return data;
  },

  getTeamNotificationCounts: async (): Promise<{ counts: Record<string, number> }> => {
    const { data } = await apiClient.get(`/teams/notifications/counts`);
    return data;
  },

  markNotificationRead: async (teamId: string, notificationId: string) => {
    const { data } = await apiClient.patch(
      `/teams/${teamId}/notifications/${notificationId}/read`,
    );
    return data;
  },

  dismissNotification: async (teamId: string, notificationId: string) => {
    const { data } = await apiClient.patch(
      `/teams/${teamId}/notifications/${notificationId}/dismiss`,
    );
    return data;
  },
};

