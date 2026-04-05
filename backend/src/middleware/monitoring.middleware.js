/**
 * CloudAudit — Express middleware: `monitoring.middleware`.
 * Applied to requests before route handlers; keep side effects minimal and ordered.
 */

import { logger } from "#utils/logger.js";
import { recordRequestMetric } from "#utils/monitoring/metrics.store.js";

const getRequestPath = (req) => req.originalUrl || req.url || "/";

export const requestMetricsMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;

    recordRequestMetric({
      method: req.method,
      path: getRequestPath(req),
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    });
  });

  next();
};

export const requestLoggerMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;

    const level = res.statusCode >= 500 ? "error" : "info";
    logger.log(level, "HTTP request completed", {
      method: req.method,
      path: getRequestPath(req),
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      userId: req.userId || null,
      ip: req.ip,
    });
  });

  next();
};

