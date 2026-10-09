import type { Request, Response, NextFunction } from "express";
import { verifyJWT } from "../config/security.js";
import { UserModel, IUser } from "../models/User.js";
import { SessionModel } from "../models/Session.js";
import { AppError } from "./errorHandler.js";
import { ENV } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      sessionId?: string;
    }
  }
}

export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let token = "";

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies[ENV.COOKIE_NAME]) {
      token = req.cookies[ENV.COOKIE_NAME];
    }

    // 2. Check Authorization header
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      next();
      return;
    }

    const payload = verifyJWT(token);
    if (!payload) {
      next();
      return;
    }

    const user = await UserModel.findById(payload.userId);
    if (!user || user.status === "DELETED" || user.status === "SUSPENDED") {
      next();
      return;
    }

    // If session ID was stored in token, check session is still valid
    if (payload.sessionId) {
      const session = await SessionModel.findById(payload.sessionId);
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        next();
        return;
      }
      session.lastSeenAt = new Date();
      await session.save();
      req.sessionId = session._id.toString();
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user || !req.userId) {
    throw new AppError(
      "UNAUTHORIZED",
      "Authentication required. Please log in.",
      401,
    );
  }
  next();
}
