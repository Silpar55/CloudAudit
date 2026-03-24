import * as auditService from "./audit.service.js";

export const listAuditLogs = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const result = await auditService.listTeamAuditLogs(teamId, req.query);
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};
