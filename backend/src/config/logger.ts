import fs from "fs";
import path from "path";
import winston from "winston";
import type { Request, Response, NextFunction } from "express";
import { ENV } from "./env.js";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {
    // Ignore error if directory creation fails in restricted environments
  }
}

// Development console log format
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const service = meta.service;
  delete meta.service;
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const prefix = service ? `[${service}]` : "";
  return `${timestamp} ${prefix} [${level}]: ${stack || message}${metaStr}`;
});

// Configure Winston Logger
export const logger = winston.createLogger({
  level: ENV.NODE_ENV === "development" ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    errors({ stack: true }),
    ENV.NODE_ENV === "production" ? json() : combine(colorize(), devFormat),
  ),
  defaultMeta: { service: "devai-backend" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// HTTP Request Logger Middleware
export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const requestId = (req as any).requestId || "";

  res.on("finish", () => {
    // Skip health checks to avoid noise
    if (req.originalUrl === "/health" || req.originalUrl === "/ready") {
      return;
    }

    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logMetadata = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs: duration,
      requestId,
      ip: req.ip,
      userAgent: req.get("user-agent") || undefined,
    };

    const message = `HTTP ${req.method} ${req.originalUrl} - ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      logger.error(message, logMetadata);
    } else if (statusCode >= 400) {
      logger.warn(message, logMetadata);
    } else {
      logger.info(message, logMetadata);
    }
  });

  next();
}
