import { Router } from "express";
import {
  loginUser,
  registerUser,
  getUser,
  verifyEmail,
} from "./auth.controller.js";

const router = Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/me", getUser);

router.post("/verify-email", verifyEmail);

export const authRoutes = router;
