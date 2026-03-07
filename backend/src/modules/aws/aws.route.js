import { Router } from "express";
import {
  initializePendingAccount,
  activateAwsAccount,
  getAwsAccount,
  deactivateAwsAccount,
  ceGetCostAndUsage,
  getCachedCostData,
} from "./aws.controller.js";
import { verifyAwsAccId } from "#middleware";
import { anomalyRoutes } from "#modules/anomaly/anomaly.route.js";

const router = Router({ mergeParams: true });

// ── Account management ────────────────────────────────────────────────────────

router.get("/", getAwsAccount);
router.post("/provision", initializePendingAccount);
router.post("/activate", activateAwsAccount);

// Middleware applied here
router.delete("/:accId", verifyAwsAccId, deactivateAwsAccount);

// ── Cost Explorer ─────────────────────────────────────────────────────────────

// Middleware applied to CE routes so they don't have to query the DB themselves
router.get("/ce/cost-usage/:accId", verifyAwsAccId, ceGetCostAndUsage);
router.get("/ce/cost-usage/:accId/cached", verifyAwsAccId, getCachedCostData);

// ── Anomalies Sub-Resource ──────────────────────────────────────────────────
// By applying the middleware here, your new Anomaly module will automatically
// receive req.awsAccount and never have to query the DB for it!
router.use("/:accId/anomalies", verifyAwsAccId, anomalyRoutes);

export const awsRoutes = router;
