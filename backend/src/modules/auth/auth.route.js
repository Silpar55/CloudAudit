import { Router } from "express";
import {
  loginUser,
  registerUser,
  getUser,
  deleteAccount,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  refreshAccessToken,
} from "./auth.controller.js";
import { verifyToken } from "#middleware";

const router = Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/me", getUser);
router.post("/refresh", refreshAccessToken);
router.post("/verify-email", verifyEmail);

router.delete("/account", verifyToken, deleteAccount);
router.patch("/password", verifyToken, changePassword);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

export const authRoutes = router;
