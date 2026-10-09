import type { Request, Response, NextFunction } from "express";
import { sourceService } from "../services/sourceService.js";

export async function listSources(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const sources = await sourceService.listSources(projectId);
    res.status(200).json({ success: true, sources });
  } catch (err) {
    next(err);
  }
}

export async function createSource(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const { type, name, config } = req.body;
    if (!type || !name) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Source type and name are required.",
          },
        });
      return;
    }

    const source = await sourceService.createSource(
      projectId,
      type,
      name,
      config || {},
      req.userId!,
    );
    res
      .status(201)
      .json({
        success: true,
        source,
        message: "Source connected successfully.",
      });
  } catch (err) {
    next(err);
  }
}

export async function updateSource(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId, sourceId } = req.params;
    const { name, status, config, metadata } = req.body;
    const updated = await sourceService.updateSource(
      projectId,
      sourceId,
      { name, status, config, metadata },
      req.userId!,
    );
    res
      .status(200)
      .json({
        success: true,
        source: updated,
        message: "Source updated successfully.",
      });
  } catch (err) {
    next(err);
  }
}

export async function disconnectSource(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { projectId, sourceId } = req.params;
    await sourceService.disconnectSource(projectId, sourceId, req.userId!);
    res.status(200).json({ success: true, message: "Source disconnected." });
  } catch (err) {
    next(err);
  }
}
