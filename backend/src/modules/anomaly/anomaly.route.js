/**
 * CloudAudit — Express router: `anomaly`.
 * Path definitions and middleware chain for this feature.
 */

import { Router } from "express";
import {
  getAnomalies,
  triggerAnalysis,
  getAnalysisStatus,
  dismissAnomaly,
  resolveAnomaly,
} from "./anomaly.controller.js";

const router = Router({ mergeParams: true });

// GET /teams/:teamId/aws-accounts/:accId/anomalies
router.get("/", getAnomalies);

// POST /teams/:teamId/aws-accounts/:accId/anomalies/analyze
router.post("/analyze", triggerAnalysis);
router.get("/analyze/status", getAnalysisStatus);
router.patch("/:anomalyId/dismiss", dismissAnomaly);
router.patch("/:anomalyId/resolve", resolveAnomaly);

export const anomalyRoutes = router;
