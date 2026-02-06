import { Router } from "express";
import { verifyPermissions, verifyTeamId } from "#middleware";
import {
  createTeam,
  deleteTeam,
  addTeamMember,
  deactivateTeamMember,
  changeMemberRole,
} from "./team.controller.js";
import { awsRoutes } from "#modules/aws/aws.route.js";

const router = Router();

// Teams resource
router.post("/", createTeam);
router.delete("/:teamId", verifyPermissions, verifyTeamId, deleteTeam);

// Member sub-resource
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
