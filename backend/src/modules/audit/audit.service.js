import * as auditModel from "./audit.model.js";

export const listTeamAuditLogs = async (teamId, query) => {
  return auditModel.listAuditLogsForTeam(teamId, query);
};
