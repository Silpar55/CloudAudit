import { Router } from "express";
import { verifyPermissions } from "#middleware";
import {
  createTeam,
  deleteTeam,
  addTeamMember,
  deactivateTeamMember,
} from "./team.controller.js";

const router = Router();

router.post("/create", createTeam);
router.delete("/delete/:teamId", verifyPermissions, deleteTeam);
router.put("/add-member/:teamId", verifyPermissions, addTeamMember);
router.put("/remove-member/:teamId", verifyPermissions, deactivateTeamMember);

export const teamRoutes = router;
