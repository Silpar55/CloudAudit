/**
 * CloudAudit — Express router: `team`.
 * Path definitions and middleware chain for this feature.
 */

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
  getOrCreateTeamShareInvite,
  deactivateTeamMember,
  changeMemberRole,
  updateMyAnalysisNotificationPreferences,
  searchUsersToInvite,
  acceptTeamInvitation,
  acceptTeamInvitationById,
  listMyInvitations,
  declineInvitation,
} from "./team.controller.js";
import { awsRoutes } from "#modules/aws/aws.route.js";

const router = Router();

// Teams resource
router.get("/", getTeamsByUserId);
router.post("/", createTeam);

// Invitations (user-scoped). Must be registered BEFORE "/:teamId" routes,
// otherwise Express will treat "invitations" as a teamId.
router.get("/invitations", listMyInvitations);
router.post("/invitations/accept", acceptTeamInvitation);
router.post("/invitations/:invitationId/accept", acceptTeamInvitationById);
router.post("/invitations/:invitationId/decline", declineInvitation);

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
router.get("/:teamId", verifyTeamId, verifyTeamMembership, getTeamById);
router.patch("/:teamId", verifyPermissions, verifyTeamId, updateTeam);
router.delete("/:teamId", verifyPermissions, verifyTeamId, deleteTeam);

// Member sub-resource (list must be registered before /:teamId/members)
router.get(
  "/:teamId/members/list",
  verifyTeamId,
  verifyTeamMembership,
  listTeamMembers,
);
router.get(
  "/:teamId/members/search",
  verifyTeamId,
  verifyPermissions,
  searchUsersToInvite,
);
router.get("/:teamId/members", verifyTeamId, verifyTeamMembership, getTeamMemberById);
router.patch(
  "/:teamId/members/me/analysis-notifications",
  verifyTeamId,
  verifyTeamMembership,
  updateMyAnalysisNotificationPreferences,
);
router.post(
  "/:teamId/members/share-link",
  verifyPermissions,
  verifyTeamId,
  getOrCreateTeamShareInvite,
);
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
router.use("/:teamId/aws-accounts", verifyTeamId, verifyTeamMembership, awsRoutes);

export const teamRoutes = router;
