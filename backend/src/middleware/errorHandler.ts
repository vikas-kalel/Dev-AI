import type { Request, Response, NextFunction } from "express";

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

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (_req as any).requestId || undefined;

  // Custom AppError
  if (err instanceof AppError) {
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

  // Zod Validation Error
  if (err.name === "ZodError") {
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

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    res.status(409).json({
      error: {
        code: "CONFLICT",
        message: `A record with this ${field} already exists.`,
      },
      requestId,
    });
    return;
  }

  console.error("[Unhandled Error]:", err);

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
