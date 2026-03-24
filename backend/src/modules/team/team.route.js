import { Router } from "express";
import {
  verifyPermissions,
  verifyTeamId,
  verifyTeamMembership,
} from "#middleware";
import { listAuditLogs } from "#modules/audit/audit.controller.js";
import {
  createTeam,
  getTeamsByUserId,
  getTeamById,
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
