import { Router } from "express";
import { loginUser, registerUser, getUser } from "./auth.controller.js";

const router = Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/me", getUser);

export const authRoutes = router;
