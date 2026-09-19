import type { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  code?: number;
}

export function errorHandler(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("API Error:", err);

  let statusCode = err.status || err.statusCode || (typeof err.code === "number" ? err.code : 500);
  let message = err.message || "An internal server error occurred.";

  if (typeof message === "string") {
    const jsonMatch = message.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          if (parsed.error.code && typeof parsed.error.code === "number") {
            statusCode = parsed.error.code;
          }
          if (parsed.error.message) {
            message = parsed.error.message;
          }
        }
      } catch {
        // Fall back to original message if parse fails
      }
    }
  }

  if (statusCode === 503 || message.includes("high demand") || message.includes("UNAVAILABLE")) {
    statusCode = 503;
    message =
      "The Gemini AI service is currently experiencing temporary high demand. Please try again in a few moments or click 'Retry Question'.";
  }

  res.status(statusCode >= 100 && statusCode < 600 ? statusCode : 500).json({
    success: false,
    error: message,
    statusCode,
  });
}

