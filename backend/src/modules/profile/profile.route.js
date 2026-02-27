import { Router } from "express";
import {
  getProfile,
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
} from "./profile.controller.js";

const router = Router();

// Existing routes
router.get("/", getProfile);
router.patch("/", updateProfile);

// New Email Verification Routes
router.post("/email/request-change", requestEmailChange);
router.post("/email/verify", verifyEmailChange); // The frontend will hit this after extracting the token from the URL

export const profileRoutes = router;
