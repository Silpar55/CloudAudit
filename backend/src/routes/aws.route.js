import { Router } from "express";
import { connect, accounts, disconnect } from "#controllers";

const router = Router();

router.post("/connect", connect);
router.get("/accounts", accounts);
router.get("/disconnect", disconnect);

export const awsRoutes = router;
