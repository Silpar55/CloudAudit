import { Router } from "express";
import { verifyPermissions } from "#middleware";
import {
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from "./team.controller.js";

const router = Router();

router.post("/create", createTeam);
router.delete("/delete/:teamId", verifyPermissions, deleteTeam);
router.post("/add-member/:teamId", verifyPermissions, addTeamMember);
router.put("/remove-member/:teamId", verifyPermissions, removeTeamMember);

export const teamRoutes = router;
