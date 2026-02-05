import { Router } from "express";
import {
  createAwsConnection,
  listAwsAccounts,
  deleteAwsConnection,
} from "./aws.controller.js";

const router = Router();

router.post("/connect/:teamId", createAwsConnection);
router.get("/accounts", listAwsAccounts);
router.get("/disconnect", deleteAwsConnection);

export const awsRoutes = router;
