import { Router } from "express";
import {
  verifyPermissions,
  verifyTeamId,
  verifyTeamMembership,
} from "#middleware";
import {
  listAuditLogs,
  listNotifications,
  markNotificationRead,
  dismissNotification,
} from "#modules/audit/audit.controller.js";
import {
  createTeam,
  getTeamsByUserId,
  getTeamById,
  getTeamNotificationCounts,
  updateTeam,
  deleteTeam,
  getTeamMemberById,
  listTeamMembers,
  addTeamMember,
  deactivateTeamMember,
  changeMemberRole,
} from "./team.controller.js";
import { awsRoutes } from "#modules/aws/aws.route.js";

const router = Router();

// Teams resource
router.get("/", getTeamsByUserId);
router.post("/", createTeam);
router.get(
  "/:teamId/audit-logs",
  verifyTeamId,
  verifyPermissions,
  listAuditLogs,
);

router.get(
  "/:teamId/notifications",
  verifyTeamId,
  verifyTeamMembership,
  listNotifications,
);

// Counts (used in the teams dashboard to show unread badges)
router.get("/notifications/counts", getTeamNotificationCounts);

// Per-user notification actions
router.patch(
  "/:teamId/notifications/:notificationId/read",
  verifyTeamId,
  verifyTeamMembership,
  markNotificationRead,
);

router.patch(
  "/:teamId/notifications/:notificationId/dismiss",
  verifyTeamId,
  verifyTeamMembership,
  dismissNotification,
);
router.get("/:teamId", verifyTeamId, getTeamById);
router.patch("/:teamId", verifyPermissions, verifyTeamId, updateTeam);
router.delete("/:teamId", verifyPermissions, verifyTeamId, deleteTeam);

// Member sub-resource (list must be registered before /:teamId/members)
router.get(
  "/:teamId/members/list",
  verifyTeamId,
  verifyTeamMembership,
  listTeamMembers,
);
router.get("/:teamId/members", verifyTeamId, getTeamMemberById);
router.post("/:teamId/members", verifyPermissions, verifyTeamId, addTeamMember);
router.delete(
  "/:teamId/members/:userId",
  verifyPermissions,
  deactivateTeamMember,
);
router.patch(
  "/:teamId/members/:userId",
  verifyPermissions,
  verifyTeamId,
  changeMemberRole,
);

// AWS sub-resource
// /:teamId/aws-accounts
router.use("/:teamId/aws-accounts", verifyTeamId, awsRoutes);

export const teamRoutes = router;
