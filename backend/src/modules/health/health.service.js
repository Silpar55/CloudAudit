import jwt from "jsonwebtoken";
import { pool } from "#config";
import { getMonitoringMetricsSnapshot } from "#utils/monitoring/metrics.store.js";

export const checkServerStatus = async () => {
  const healthcheck = {
    uptime: process.uptime(),
    message: "OK",
    timestamp: Date.now(),
    server: "up",
  };

  return healthcheck;
};

export const checkDatabaseStatus = async () => {
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
};

export const checkAuthStatus = async (authHeader) => {
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
};

export const checkMlServiceStatus = async () => {
  const mlServiceUrl =
    process.env.ML_SERVICE_URL ||
    "http://127.0.0.1:5001/api/ml/analyze?version=2";

  const healthcheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    mlServiceUrl,
    mlService: "unhealthy",
    message: "ML service unreachable",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(mlServiceUrl, {
      method: "OPTIONS",
      signal: controller.signal,
    }).catch(async () => {
      return await fetch(mlServiceUrl, {
        method: "GET",
        signal: controller.signal,
      });
    });

    clearTimeout(timeout);

    healthcheck.mlService = response.ok ? "healthy" : "degraded";
    healthcheck.message = response.ok
      ? "OK"
      : `ML service responded with status ${response.status}`;
    return healthcheck;
  } catch (_error) {
    return healthcheck;
  }
};

export const getMonitoringSnapshot = async () => {
  const [dbStatus, mlStatus] = await Promise.all([
    checkDatabaseStatus(),
    checkMlServiceStatus(),
  ]);

  const metrics = getMonitoringMetricsSnapshot();
  const apiStatus =
    dbStatus.database === "healthy" && mlStatus.mlService !== "unhealthy"
      ? "healthy"
      : "degraded";

  return {
    status: apiStatus,
    generatedAt: Date.now(),
    dependencies: {
      database: dbStatus.database,
      mlService: mlStatus.mlService,
    },
    metrics,
  };
};
