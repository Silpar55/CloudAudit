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

export const listNotifications = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const result = await auditService.listTeamNotifications(
      teamId,
      req.userId,
      req.query,
    );
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { teamId, notificationId } = req.params;
    await auditService.markTeamNotificationRead(
      teamId,
      notificationId,
      req.userId,
    );
    return res.status(200).send({ message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

export const dismissNotification = async (req, res, next) => {
  try {
    const { teamId, notificationId } = req.params;
    await auditService.dismissTeamNotification(
      teamId,
      notificationId,
      req.userId,
    );
    return res.status(200).send({ message: "Notification dismissed" });
  } catch (err) {
    next(err);
  }
};
