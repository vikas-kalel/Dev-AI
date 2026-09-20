import type { Request, Response, NextFunction } from "express";
import { membershipService } from "../services/membershipService.js";
import { ProjectRole } from "../models/ProjectMembership.js";

export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const members = await membershipService.listMembers(projectId);
    res.status(200).json({ success: true, members });
  } catch (err) {
    next(err);
  }
}

export async function addMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const { email, role } = req.body;
    if (!email || !role) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and role are required.",
          },
        });
      return;
    }

    const result = await membershipService.addMember(
      projectId,
      email,
      role as ProjectRole,
      req.userId!,
    );
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function changeRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body;
    if (!role || (role !== "MAINTAINER" && role !== "DEVELOPER")) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Role must be MAINTAINER or DEVELOPER.",
          },
        });
      return;
    }

    const updated = await membershipService.changeRole(
      projectId,
      userId,
      role as ProjectRole,
      req.userId!,
    );
    res
      .status(200)
      .json({
        success: true,
        membership: updated,
        message: `Role updated to ${role}.`,
      });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId, userId } = req.params;
    await membershipService.removeMember(projectId, userId, req.userId!);
    res
      .status(200)
      .json({ success: true, message: "Member removed from project." });
  } catch (err) {
    next(err);
  }
}
