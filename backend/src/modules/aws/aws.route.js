import { Router } from "express";
import {
  initializePendingAccount,
  activateAwsAccount,
  getAwsAccount,
  deactivateAwsAccount,
  ceGetCostAndUsage,
  getCachedCostData,
  syncCurData,
  retryCurSetup,
  checkCurStatus,
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

// ── Cost and Usage Report (CUR) ───────────────────────────────────────────────
router.get("/cur/status/:accId", verifyAwsAccId, checkCurStatus);
router.post("/cur/sync/:accId", verifyAwsAccId, syncCurData);
router.post("/cur/retry-setup/:accId", verifyAwsAccId, retryCurSetup);

// ── Anomalies Sub-Resource ──────────────────────────────────────────────────
router.use("/:accId/anomalies", verifyAwsAccId, anomalyRoutes);

export const awsRoutes = router;
