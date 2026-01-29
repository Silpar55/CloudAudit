import { Router } from "express";
import { loginUser, registerUser } from "./auth.controller.js";

const router = Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);

export const authRoutes = router;
