import type { Request, Response, NextFunction } from "express";
import { invitationService } from "../services/invitationService.js";

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
