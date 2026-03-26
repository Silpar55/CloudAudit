import * as auditModel from "./audit.model.js";

export const listTeamAuditLogs = async (teamId, query) => {
  return auditModel.listAuditLogsForTeam(teamId, query);
};

export const listTeamNotifications = async (
  teamId,
  userId,
  query = {},
) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(query.limit, 10) || 5));
  const includeDismissed =
    String(query.includeDismissed || "false") === "true";

  return auditModel.listTeamNotificationsForUser(teamId, userId, {
    page,
    limit,
    includeDismissed,
  });
};

export const markTeamNotificationRead = async (teamId, auditLogId, userId) => {
  await auditModel.markNotificationRead(teamId, auditLogId, userId);
};

export const dismissTeamNotification = async (teamId, auditLogId, userId) => {
  await auditModel.dismissNotification(teamId, auditLogId, userId);
};
