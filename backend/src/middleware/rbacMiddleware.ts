import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {
  OrganizationMembershipModel,
  IOrganizationMembership,
  OrgRole,
} from "../models/OrganizationMembership.js";
import {
  ProjectMembershipModel,
  IProjectMembership,
  ProjectRole,
} from "../models/ProjectMembership.js";
import { ProjectModel } from "../models/Project.js";
import { AppError } from "./errorHandler.js";

declare global {
  namespace Express {
    interface Request {
      orgMembership?: IOrganizationMembership;
      projectMembership?: IProjectMembership;
      isOrgAdmin?: boolean;
    }
  }
}

export function requireOrgRole(requiredRole: OrgRole = "ADMIN") {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
      }

      const orgIdStr =
        req.params.organizationId ||
        req.body.organizationId ||
        req.query.organizationId;
      if (!orgIdStr || !Types.ObjectId.isValid(orgIdStr)) {
        throw new AppError(
          "BAD_REQUEST",
          "Valid organizationId is required.",
          400,
        );
      }

      const orgMembership = await OrganizationMembershipModel.findOne({
        organizationId: new Types.ObjectId(orgIdStr),
        userId: new Types.ObjectId(req.userId),
        status: "ACTIVE",
      });

      if (!orgMembership) {
        throw new AppError(
          "FORBIDDEN",
          "You are not a member of this organization.",
          403,
        );
      }

      if (requiredRole === "ADMIN" && orgMembership.role !== "ADMIN") {
        throw new AppError(
          "FORBIDDEN",
          "Organization Admin permissions required.",
          403,
        );
      }

      req.orgMembership = orgMembership;
      req.isOrgAdmin = orgMembership.role === "ADMIN";
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireProjectRole(
  allowedRoles: ProjectRole[] = ["MAINTAINER", "DEVELOPER"],
) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
      }

      const projectIdStr =
        req.params.projectId || req.body.projectId || req.query.projectId;
      if (!projectIdStr || !Types.ObjectId.isValid(projectIdStr)) {
        throw new AppError("BAD_REQUEST", "Valid projectId is required.", 400);
      }

      const project = await ProjectModel.findById(projectIdStr);
      if (!project) {
        throw new AppError("NOT_FOUND", "Project not found.", 404);
      }

      // Check organization membership of user
      const orgMembership = await OrganizationMembershipModel.findOne({
        organizationId: project.organizationId,
        userId: new Types.ObjectId(req.userId),
        status: "ACTIVE",
      });

      // If user is Org Admin, they have universal project authority
      if (orgMembership && orgMembership.role === "ADMIN") {
        req.isOrgAdmin = true;
        req.orgMembership = orgMembership;
        next();
        return;
      }

      // Otherwise, check project membership
      const projectMembership = await ProjectMembershipModel.findOne({
        projectId: project._id,
        userId: new Types.ObjectId(req.userId),
        status: "ACTIVE",
      });

      if (!projectMembership) {
        throw new AppError(
          "FORBIDDEN",
          "You are not a member of this project.",
          403,
        );
      }

      if (!allowedRoles.includes(projectMembership.role)) {
        throw new AppError(
          "FORBIDDEN",
          `Project role "${allowedRoles.join(" or ")}" required for this action.`,
          403,
        );
      }

      req.projectMembership = projectMembership;
      next();
    } catch (err) {
      next(err);
    }
  };
}
