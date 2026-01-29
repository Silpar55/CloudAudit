import { Router } from "express";
import { createTeam, deleteTeam, addTeamMember } from "./team.controller.js";

const router = Router();

router.post("/create", createTeam);
router.get("/delete", deleteTeam);
router.get("/add-member", addTeamMember);

export const teamRoutes = router;
