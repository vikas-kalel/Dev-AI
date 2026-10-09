import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Shared request context extractor ──────────────────────────────────────
function getRequestContext(req: Request) {
  return {
    requestId: (req as any).requestId || undefined,
    method: req.method,
    url: req.originalUrl || req.url,
    userId: (req as any).userId || undefined,
    ip: req.ip,
  };
}

// ── Global Express Error Handler ──────────────────────────────────────────
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).requestId || undefined;
  const ctx = getRequestContext(req);

  // ── 1. Custom AppError (known business/domain errors) ───────────────────
  if (err instanceof AppError) {
    // 4xx client errors → warn; 5xx server errors → error
    const logLevel = err.statusCode >= 500 ? "error" : "warn";
    logger[logLevel](`[AppError] ${err.code}: ${err.message}`, {
      ...ctx,
      errorCode: err.code,
      statusCode: err.statusCode,
      details: err.details,
    });
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId,
    });
    return;
  }

  // ── 2. Zod Validation Error ──────────────────────────────────────────────
  if (err.name === "ZodError") {
    logger.warn("[ValidationError] ZodError on request", {
      ...ctx,
      issues: err.errors,
    });
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.errors,
      },
      requestId,
    });
    return;
  }

  // ── 3. Mongoose Duplicate Key Error ─────────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    logger.warn("[MongoConflict] Duplicate key error", {
      ...ctx,
      field,
      keyPattern: err.keyPattern,
    });
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: `A record with this ${field} already exists.`,
      },
      requestId,
    });
    return;
  }

  // ── 4. Mongoose Validation Error ────────────────────────────────────────
  if (err.name === "ValidationError") {
    logger.warn("[MongoValidation] Mongoose validation failed", {
      ...ctx,
      errors: err.errors,
    });
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.message,
      },
      requestId,
    });
    return;
  }

  // ── 5. JWT / Auth errors ─────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    logger.warn(`[AuthError] ${err.name}: ${err.message}`, ctx);
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Authentication token is invalid or expired.",
      },
      requestId,
    });
    return;
  }

  // ── 6. Unhandled / unexpected errors ────────────────────────────────────
  logger.error("[UnhandledError] Unexpected server error", {
    ...ctx,
    errorName: err?.name,
    errorMessage: err?.message,
    errorCode: err?.code,
    stack: err?.stack,
  });

  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  const message = err.message || "An internal server error occurred.";

  res.status(statusCode).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
    requestId,
  });
}
