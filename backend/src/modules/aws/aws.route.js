import { Router } from "express";
import {
  initializePendingAccount,
  // listAwsAccounts,
  activateAwsAccount,
  deactivateAwsAccount,
  ceGetCostAndUsage,
} from "./aws.controller.js";
import { verifyAwsAccId } from "#middleware";

const router = Router({ mergeParams: true });

router.post("/provision", initializePendingAccount);
router.post("/activate", activateAwsAccount);
router.get("/ce/cost-usage/:accId", ceGetCostAndUsage);
// router.get("/", listAwsAccounts);
router.delete("/:accId", verifyAwsAccId, deactivateAwsAccount);

export const awsRoutes = router;
