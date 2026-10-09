import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const existingId = req.headers["x-request-id"];
  const requestId =
    typeof existingId === "string" && existingId.trim()
      ? existingId.trim()
      : crypto.randomUUID();

  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
