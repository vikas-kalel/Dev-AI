import type { Request, Response, NextFunction } from "express";
import { projectService } from "../services/projectService.js";

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, slug, description } = req.body;
    const organizationId = req.params.organizationId;
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

    const project = await projectService.createProject(
      organizationId,
      name,
      slug,
      description,
      req.userId!,
    );
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
}

export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = req.params.organizationId;
    const projects = await projectService.listProjects(
      organizationId,
      req.userId!,
    );
    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
}

export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const project = await projectService.getProject(projectId, req.userId!);
    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
}

export async function archiveProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const project = await projectService.archiveProject(projectId, req.userId!);
    res
      .status(200)
      .json({
        success: true,
        project,
        message: "Project archived successfully.",
      });
  } catch (err) {
    next(err);
  }
}
