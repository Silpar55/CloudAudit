import { Router } from "express";
import { login, register } from "#controllers";

const router = Router();

router.post("/signup", register);
router.post("/login", login);

export const authRoutes = router;
