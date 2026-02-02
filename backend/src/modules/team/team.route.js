import { Router } from "express";
import { verifyPermissions } from "#middleware";
import {
  createTeam,
  deleteTeam,
  addTeamMember,
  deactivateTeamMember,
  changeMemberRole,
} from "./team.controller.js";

const router = Router();

router.post("/create", createTeam);
router.delete("/delete/:teamId", verifyPermissions, deleteTeam);
router.put("/add-member/:teamId", verifyPermissions, addTeamMember);
router.put("/remove-member/:teamId", verifyPermissions, deactivateTeamMember);
router.put("/change-member-role/:teamId", verifyPermissions, changeMemberRole);

export const teamRoutes = router;
