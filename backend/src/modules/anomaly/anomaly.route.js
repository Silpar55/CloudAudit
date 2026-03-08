import { Router } from "express";
import { getAnomalies, triggerAnalysis } from "./anomaly.controller.js";

const router = Router({ mergeParams: true });

// GET /teams/:teamId/aws-accounts/:accId/anomalies
router.get("/", getAnomalies);

// POST /teams/:teamId/aws-accounts/:accId/anomalies/analyze
router.post("/analyze", triggerAnalysis);

export const anomalyRoutes = router;
