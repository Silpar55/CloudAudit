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

const router = Router({ mergeParams: true });

// ── Account management ────────────────────────────────────────────────────────

// GET  /teams/:teamId/aws-accounts
// Returns the team's AWS account record (internal id, status, timestamps).
router.get("/", getAwsAccount);

// POST /teams/:teamId/aws-accounts/provision
router.post("/provision", initializePendingAccount);

// POST /teams/:teamId/aws-accounts/activate
router.post("/activate", activateAwsAccount);

// DELETE /teams/:teamId/aws-accounts/:accId
router.delete("/:accId", verifyAwsAccId, deactivateAwsAccount);

// ── Cost Explorer ─────────────────────────────────────────────────────────────

// GET /teams/:teamId/aws-accounts/ce/cost-usage/:accId
// Triggers a live AWS Cost Explorer sync and upserts results into the cache.
// Query params: startDate, endDate (YYYY-MM-DD). :accId = aws_accounts.id UUID.
router.get("/ce/cost-usage/:accId", ceGetCostAndUsage);

// GET /teams/:teamId/aws-accounts/ce/cost-usage/:accId/cached
// Returns rows already stored in cost_explorer_cache — no AWS API call.
// Query params: startDate, endDate (YYYY-MM-DD). :accId = aws_accounts.id UUID.
router.get("/ce/cost-usage/:accId/cached", getCachedCostData);

export const awsRoutes = router;
