import jwt from "jsonwebtoken";
import { pool } from "#config";
import { getMonitoringMetricsSnapshot } from "#utils/monitoring/metrics.store.js";
import {
  createSTSClient,
  getCallerIdentity,
} from "#utils/aws/client-factory.js";
import {
  ensurePlatformCredentials,
  getPlatformStsCredentials,
} from "#utils/aws/platform-credentials.js";

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
    jwt.verify(token, process.env.JWT_SECRET);
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

export const checkAwsCredentialsStatus = async () => {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    awsCredentials: "unhealthy",
    awsAccount: null,
    message: "AWS credentials unavailable",
  };

  try {
    await ensurePlatformCredentials();
    const creds = await getPlatformStsCredentials();
    const sts = createSTSClient(process.env.AWS_REGION || "us-east-1", creds);
    const identity = await getCallerIdentity(sts);

    return {
      ...healthcheck,
      awsCredentials: "healthy",
      awsAccount: identity?.Account || null,
      message: "OK",
    };
  } catch (_error) {
    return healthcheck;
  }
};

export const getReadinessSnapshot = async () => {
  const [serverStatus, dbStatus, awsStatus, mlStatus] = await Promise.all([
    checkServerStatus(),
    checkDatabaseStatus(),
    checkAwsCredentialsStatus(),
    checkMlServiceStatus(),
  ]);

  const healthy =
    serverStatus.server === "up" &&
    dbStatus.database === "healthy" &&
    awsStatus.awsCredentials === "healthy" &&
    mlStatus.mlService !== "unhealthy";

  return {
    status: healthy ? "healthy" : "degraded",
    timestamp: Date.now(),
    checks: {
      server: serverStatus.server,
      database: dbStatus.database,
      awsCredentials: awsStatus.awsCredentials,
      mlService: mlStatus.mlService,
    },
    details: {
      awsAccount: awsStatus.awsAccount,
      mlServiceUrl: mlStatus.mlServiceUrl,
    },
    uptimeSec: Number(process.uptime().toFixed(1)),
  };
};

export const getMonitoringSnapshot = async () => {
  const [dbStatus, mlStatus, awsStatus] = await Promise.all([
    checkDatabaseStatus(),
    checkMlServiceStatus(),
    checkAwsCredentialsStatus(),
  ]);

  const metrics = getMonitoringMetricsSnapshot();
  const apiStatus =
    dbStatus.database === "healthy" &&
    mlStatus.mlService !== "unhealthy" &&
    awsStatus.awsCredentials === "healthy"
      ? "healthy"
      : "degraded";

  return {
    status: apiStatus,
    generatedAt: Date.now(),
    dependencies: {
      database: dbStatus.database,
      awsCredentials: awsStatus.awsCredentials,
      mlService: mlStatus.mlService,
    },
    metrics,
  };
};
