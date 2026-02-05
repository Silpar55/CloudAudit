import { Router } from "express";
import {
  createAwsConnection,
  listAwsAccounts,
  deactivateAwsConnection,
} from "./aws.controller.js";

const router = Router({ mergeParams: true });

router.post("/", createAwsConnection);
router.get("/", listAwsAccounts);
router.delete("/:accountId", deactivateAwsConnection);

export const awsRoutes = router;
