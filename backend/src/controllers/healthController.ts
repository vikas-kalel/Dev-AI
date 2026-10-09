import type { Request, Response } from "express";
import mongoose from "mongoose";

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: "OK",
    service: "dev-ai-backend",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

export function getReady(_req: Request, res: Response): void {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    res.status(200).json({
      status: "READY",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "NOT_READY",
      database: "DISCONNECTED",
      timestamp: new Date().toISOString(),
    });
  }
}
