import type { Request, Response, NextFunction } from "express";
import { organizationService } from "../services/organizationService.js";

export async function createOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name and slug are required.",
          },
        });
      return;
    }

    const org = await organizationService.createOrganization(
      name,
      slug,
      req.userId!,
    );
    res.status(201).json({ success: true, organization: org });
  } catch (err) {
    next(err);
  }
}

export async function getOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const org = await organizationService.getOrganization(
      req.params.organizationId,
    );
    res.status(200).json({ success: true, organization: org });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationOverview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const overview = await organizationService.getOverview(
      req.params.organizationId,
    );
    res.status(200).json({ success: true, overview });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizationUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId, role, status, search } = req.query;
    const users = await organizationService.getUsers(
      req.params.organizationId,
      {
        projectId: projectId ? String(projectId) : undefined,
        role: role ? String(role) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined,
      },
    );
    res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
}
