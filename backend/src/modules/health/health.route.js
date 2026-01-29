import { Router } from "express";
import {
  checkServerStatus,
  checkDatabaseStatus,
  checkAuthStatus,
} from "./health.controller.js";

const router = Router({});

router.get("/server", checkServerStatus);
router.get("/database", checkDatabaseStatus);
router.get("/auth", checkAuthStatus);

export const healthRoutes = router;
