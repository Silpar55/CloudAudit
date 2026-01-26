import pool from "../config/database.js";
import { Router } from "express";
import verifyToken from "../middleware/auth.js";
const router = Router({});

router.get("/", (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    server: "up",
  };

  try {
    return res.status(200).send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    healthcheck.server = "not working";
    return res.status(503).send(healthcheck);
  }
});

router.get("/database", async (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    database: "unhealthy",
  };

  try {
    await pool.query("SELECT 1");
    healthcheck.database = "healthy";
    return res.status(200).send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    healthcheck.database = "unhealthy";
    return res.status(503).send(healthcheck);
  }
});

router.get("/auth", verifyToken, (_req, res, _next) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    token: "valid",
  };

  try {
    return res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    healthcheck.token = "invalid";
    return res.status(503).send(healthcheck);
  }
});

export default router;
