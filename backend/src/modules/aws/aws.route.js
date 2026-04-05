/**
 * CloudAudit — Express router: `aws`.
 * Path definitions and middleware chain for this feature.
 */

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
import { recommendationRoutes } from "#modules/recommendations/recommendations.route.js";

const router = Router({ mergeParams: true });

// ── Account management ────────────────────────────────────────────────────────

router.get("/", getAwsAccount);
router.post("/provision", initializePendingAccount);
router.post("/activate", activateAwsAccount);

// Middleware applied here
router.delete("/:internalAccountId", verifyAwsAccId, deactivateAwsAccount);

// ── Cost Explorer ─────────────────────────────────────────────────────────────

router.get(
  "/ce/cost-usage/:internalAccountId",
  verifyAwsAccId,
  ceGetCostAndUsage,
);
router.get(
  "/ce/cost-usage/:internalAccountId/cached",
  verifyAwsAccId,
  getCachedCostData,
);

// ── Cost and Usage Report (CUR) ───────────────────────────────────────────────
router.get("/cur/status/:internalAccountId", verifyAwsAccId, checkCurStatus);
router.post("/cur/sync/:internalAccountId", verifyAwsAccId, syncCurData);
router.post(
  "/cur/retry-setup/:internalAccountId",
  verifyAwsAccId,
  retryCurSetup,
);

// ── Anomalies Sub-Resource ──────────────────────────────────────────────────
router.use("/:internalAccountId/anomalies", verifyAwsAccId, anomalyRoutes);

// ── Recommendations Sub-Resource ──────────────────────────────────────────────────
router.use(
  "/:internalAccountId/recommendations",
  verifyAwsAccId,
  recommendationRoutes,
);

export const awsRoutes = router;
