import { Types } from "mongoose";
import { ProjectModel, IProject } from "../models/Project.js";
import { ProjectMembershipModel } from "../models/ProjectMembership.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { auditService } from "./auditService.js";
import { AppError } from "../middleware/errorHandler.js";

export class ProjectService {
  async createProject(
    orgId: string,
    name: string,
    slug: string,
    description: string | undefined,
    userId: string,
  ): Promise<IProject> {
    const oId = new Types.ObjectId(orgId);
    const uId = new Types.ObjectId(userId);
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-");

    const existing = await ProjectModel.findOne({
      organizationId: oId,
      slug: cleanSlug,
    });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "A project with this slug already exists in this organization.",
        409,
      );
    }

    const project = new ProjectModel({
      organizationId: oId,
      name: name.trim(),
      slug: cleanSlug,
      description: description?.trim(),
      status: "ACTIVE",
      createdBy: uId,
    });
    await project.save();

    // Automatically add creator as MAINTAINER so project has at least one Maintainer
    await ProjectMembershipModel.create({
      projectId: project._id,
      userId: uId,
      role: "MAINTAINER",
      status: "ACTIVE",
    });

    await auditService.log({
      organizationId: oId,
      projectId: project._id,
      actorUserId: uId,
      action: "PROJECT_CREATED",
      targetType: "PROJECT",
      targetId: project._id,
      metadata: { name: project.name, slug: project.slug },
    });

    return project;
  }

  async listProjects(orgId: string, userId: string): Promise<any[]> {
    const oId = new Types.ObjectId(orgId);
    const uId = new Types.ObjectId(userId);

    const orgMembership = await OrganizationMembershipModel.findOne({
      organizationId: oId,
      userId: uId,
      status: "ACTIVE",
    });

    const isOrgAdmin = orgMembership?.role === "ADMIN";

    // All active projects in the organization
    const allProjects = await ProjectModel.find({
      organizationId: oId,
      status: "ACTIVE",
    }).lean();
    const userMemberships = await ProjectMembershipModel.find({
      userId: uId,
      projectId: { $in: allProjects.map((p) => p._id) },
      status: "ACTIVE",
    }).lean();

    const membershipMap = new Map(
      userMemberships.map((m) => [m.projectId.toString(), m]),
    );

    if (isOrgAdmin) {
      // Org Admin sees all projects
      return allProjects.map((p) => {
        const userMem = membershipMap.get(p._id.toString());
        return {
          ...p,
          role: userMem ? userMem.role : "MAINTAINER", // Admin possesses Maintainer privileges by default
          isDirectMember: !!userMem,
        };
      });
    }

    // Regular member only sees projects they are explicitly part of
    return allProjects
      .filter((p) => membershipMap.has(p._id.toString()))
      .map((p) => {
        const userMem = membershipMap.get(p._id.toString())!;
        return {
          ...p,
          role: userMem.role,
          isDirectMember: true,
        };
      });
  }

  async getProject(projectId: string, userId: string): Promise<any> {
    const project = await ProjectModel.findById(projectId).lean();
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    const uId = new Types.ObjectId(userId);
    const orgMembership = await OrganizationMembershipModel.findOne({
      organizationId: project.organizationId,
      userId: uId,
      status: "ACTIVE",
    });

    const projectMembership = await ProjectMembershipModel.findOne({
      projectId: project._id,
      userId: uId,
      status: "ACTIVE",
    });

    const isOrgAdmin = orgMembership?.role === "ADMIN";
    if (!isOrgAdmin && !projectMembership) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have access to this project.",
        403,
      );
    }

    const role = projectMembership ? projectMembership.role : "MAINTAINER";

    return {
      ...project,
      role,
      isOrgAdmin,
    };
  }

  async archiveProject(projectId: string, userId: string): Promise<IProject> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    project.status = "ARCHIVED";
    await project.save();

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(userId),
      action: "PROJECT_ARCHIVED",
      targetType: "PROJECT",
      targetId: project._id,
      metadata: { name: project.name, slug: project.slug },
    });

    return project;
  }
}

export const projectService = new ProjectService();
