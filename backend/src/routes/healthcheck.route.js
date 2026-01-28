import { Router } from "express";
import { authCheck, databaseCheck, serverCheck } from "#controllers";

const router = Router({});

router.get("/", serverCheck);
router.get("/database", databaseCheck);
router.get("/auth", authCheck);

export const healthcheckRoutes = router;
