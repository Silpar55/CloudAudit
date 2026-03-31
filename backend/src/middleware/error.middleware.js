import { logger } from "#utils/logger.js";

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;

  logger.error("Unhandled API error", {
    statusCode: status,
    message: err.message || "Internal Server Error",
    stack: err.stack,
  });

  res.status(status).json({
    message: err.message || "Internal Server Error",
    ...(err.code ? { code: err.code } : {}),
    ...(err.headline ? { headline: err.headline } : {}),
    ...(err.detail ? { detail: err.detail } : {}),
    ...(err.meta ? { meta: err.meta } : {}),
  });
}
