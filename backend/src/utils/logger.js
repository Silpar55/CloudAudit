/**
 * CloudAudit — Backend utility: `logger`.
 * Shared helpers for formatting, validation, logging, etc.
 */

import winston from "winston";

const level = process.env.LOG_LEVEL || "info";
const isDevelopment = process.env.NODE_ENV !== "production";

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level: logLevel, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${logLevel}: ${message}${metaString}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level,
  defaultMeta: { service: "cloudaudit-api" },
  format: isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
});

