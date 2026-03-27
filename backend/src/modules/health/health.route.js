import { Router } from "express";
import {
  getReadinessSnapshot,
  checkServerStatus,
  checkDatabaseStatus,
  checkAuthStatus,
  getMonitoringSnapshot,
} from "./health.controller.js";

const router = Router({});

router.get("/", getReadinessSnapshot);
router.get("/server", checkServerStatus);
router.get("/database", checkDatabaseStatus);
router.get("/auth", checkAuthStatus);
router.get("/monitoring", getMonitoringSnapshot);

export const healthRoutes = router;
