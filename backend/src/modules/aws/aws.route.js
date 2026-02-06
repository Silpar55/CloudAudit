import { Router } from "express";
import {
  initializePendingAccount,
  // listAwsAccounts,
  activateAwsAccount,
  deactivateAwsAccount,
} from "./aws.controller.js";
import { verifyAwsAccId } from "#middleware";

const router = Router({ mergeParams: true });

router.post("/provision", initializePendingAccount);
router.post("/activate", activateAwsAccount);
// router.get("/", listAwsAccounts);
router.delete("/:accountId", verifyAwsAccId, deactivateAwsAccount);

export const awsRoutes = router;
