import { Router } from "express";
import { getProfile, updateProfile } from "./profile.controller.js";

const router = Router();

// Profile resource
router.get("/", getProfile);
router.patch("/", updateProfile);

export const profileRoutes = router;
