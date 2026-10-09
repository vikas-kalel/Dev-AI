import type { Request, Response, NextFunction } from "express";
import { invitationService } from "../services/invitationService.js";
import { ENV } from "../config/env.js";

export async function getInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params;
    const invitation = await invitationService.getInvitationByToken(token);
    res.status(200).json({ success: true, invitation });
  } catch (err) {
    next(err);
  }
}

export async function acceptAndSignup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!password) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Password is required." },
      });
      return;
    }

    const result = await invitationService.acceptAndSignup(
      token,
      name,
      password,
    );

    // Set HTTP-only session cookie
    res.cookie(ENV.COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ENV.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: result.user,
      token: result.token,
      projectId: result.projectId,
      role: result.role,
      message: "Setup complete. Welcome to your workspace!",
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.params;
    const membership = await invitationService.acceptInvitation(
      token,
      req.userId!,
    );
    res.status(200).json({
      success: true,
      membership,
      message: "Invitation accepted. You now have access to the project.",
    });
  } catch (err) {
    next(err);
  }
}

export async function resendInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const token = await invitationService.resendInvitation(id, req.userId!);
    res.status(200).json({
      success: true,
      message: "Invitation has been resent.",
      token: process.env.NODE_ENV !== "production" ? token : undefined,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeInvitation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    await invitationService.revokeInvitation(id, req.userId!);
    res.status(200).json({ success: true, message: "Invitation revoked." });
  } catch (err) {
    next(err);
  }
}
