import jwt from "jsonwebtoken";
import { pool } from "#config";

export async function healthCheckServer() {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    server: "up",
  };

  return healthcheck;
}

export async function healthCheckDatabase() {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    database: "unhealthy",
  };

  try {
    await pool.query("SELECT 1");
    healthcheck.database = "healthy";
    return healthcheck;
  } catch (error) {
    healthcheck.message = "Database connection failed";
    return healthcheck;
  }
}

export async function healthCheckAuth(authHeader) {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    token: "invalid",
    message: "Missing or invalid Authorization header",
  };

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return healthcheck;
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.SECRETKEY);
    return {
      ...healthcheck,
      message: "OK",
      token: "valid",
    };
  } catch (error) {
    return {
      ...healthcheck,
      message: "Invalid or expire token",
    };
  }
}
