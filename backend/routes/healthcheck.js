import connect from "../config/database.js";
import { Router } from "express";
const router = Router({});

router.get("/", async (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    database: "unhealthy",
  };

  try {
    // Check Database
    const pool = await connect();
    await pool.query("SELECT 1");
    healthcheck.database = "healthy";
    res.status(200).send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    healthcheck.database = "unhealthy";
    res.status(503).send(healthcheck);
  }
});

export default router;
