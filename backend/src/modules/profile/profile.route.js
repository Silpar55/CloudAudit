/**
 * CloudAudit — Express router: `profile`.
 * Path definitions and middleware chain for this feature.
 */

import { Router } from "express";
import {
  getProfile,
  updateProfile,
  requestEmailChange,
} from "./profile.controller.js";

const router = Router();

// Existing routes
router.get("/", getProfile);
router.patch("/", updateProfile);

// Email Verification Routes
router.post("/email/request-change", requestEmailChange);

export const profileRoutes = router;
