import mongoose, { Types } from "mongoose";
import { OrganizationModel, IOrganization } from "../models/Organization.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { ProjectModel } from "../models/Project.js";
import { ProjectMembershipModel } from "../models/ProjectMembership.js";
import { InvitationModel } from "../models/Invitation.js";
import { auditService } from "./auditService.js";
import { AppError } from "../middleware/errorHandler.js";

export class OrganizationService {
  async createOrganization(
    name: string,
    slug: string,
    userId: string,
  ): Promise<IOrganization> {
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-");
    const uId = new Types.ObjectId(userId);

    const existing = await OrganizationModel.findOne({ slug: cleanSlug });
    if (existing) {
      throw new AppError(
        "CONFLICT",
        "An organization with this slug already exists.",
        409,
      );
    }

    const session = await mongoose.startSession();
    try {
      let createdOrg: IOrganization | null = null;
      await session.withTransaction(async () => {
        const [org] = await OrganizationModel.create(
          [
            {
              name: name.trim(),
              slug: cleanSlug,
              createdBy: uId,
              status: "ACTIVE",
            },
          ],
          { session },
        );

        await OrganizationMembershipModel.create(
          [
            {
              organizationId: org._id,
              userId: uId,
              role: "ADMIN",
              status: "ACTIVE",
            },
          ],
          { session },
        );

        createdOrg = org;
      });

      if (!createdOrg) {
        throw new Error("Failed to create organization.");
      }

      await auditService.log({
        organizationId: (createdOrg as IOrganization)._id,
        actorUserId: uId,
        action: "ORG_CREATED",
        targetType: "ORGANIZATION",
        targetId: (createdOrg as IOrganization)._id,
        metadata: { name, slug: cleanSlug },
      });

      return createdOrg;
    } catch (err: any) {
      const errMsg =
        (err?.message || "") + " " + (err?.errorResponse?.errmsg || "");
      if (
        errMsg.includes("Transaction numbers are only allowed") ||
        errMsg.includes("does not support retryable writes") ||
        errMsg.includes("replica set")
      ) {
        const org = await OrganizationModel.create({
          name: name.trim(),
          slug: cleanSlug,
          createdBy: uId,
          status: "ACTIVE",
        });

        await OrganizationMembershipModel.create({
          organizationId: org._id,
          userId: uId,
          role: "ADMIN",
          status: "ACTIVE",
        });

        await auditService.log({
          organizationId: org._id,
          actorUserId: uId,
          action: "ORG_CREATED",
          targetType: "ORGANIZATION",
          targetId: org._id,
          metadata: { name, slug: cleanSlug },
        });

        return org;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async getOrganization(orgId: string): Promise<IOrganization> {
    const org = await OrganizationModel.findById(orgId);
    if (!org) {
      throw new AppError("NOT_FOUND", "Organization not found.", 404);
    }
    return org;
  }

  async getOverview(orgId: string): Promise<any> {
    const oId = new Types.ObjectId(orgId);

    // 1. Projects in org
    const projects = await ProjectModel.find({
      organizationId: oId,
      status: "ACTIVE",
    }).lean();
    const projectIds = projects.map((p) => p._id);

    // 2. Project Memberships
    const projectMemberships = await ProjectMembershipModel.find({
      projectId: { $in: projectIds },
      status: "ACTIVE",
    }).lean();

    // 3. Organization Memberships
    const orgMemberships = await OrganizationMembershipModel.find({
      organizationId: oId,
      status: "ACTIVE",
    }).lean();

    // 4. Pending Invitations
    const pendingInvitations = await InvitationModel.find({
      organizationId: oId,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
    }).lean();

    // Counts
    const uniqueUserIds = new Set<string>();
    orgMemberships.forEach((m) => uniqueUserIds.add(m.userId.toString()));
    projectMemberships.forEach((m) => uniqueUserIds.add(m.userId.toString()));

    const maintainersCount = projectMemberships.filter(
      (m) => m.role === "MAINTAINER",
    ).length;
    const developersCount = projectMemberships.filter(
      (m) => m.role === "DEVELOPER",
    ).length;

    // Project breakdown table
    const projectBreakdown = projects.map((project) => {
      const pMembers = projectMemberships.filter(
        (m) => m.projectId.toString() === project._id.toString(),
      );
      const pInvites = pendingInvitations.filter(
        (i) => i.projectId.toString() === project._id.toString(),
      );
      const pMaintainers = pMembers.filter(
        (m) => m.role === "MAINTAINER",
      ).length;
      const pDevelopers = pMembers.filter((m) => m.role === "DEVELOPER").length;

      return {
        projectId: project._id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        totalMembers: pMembers.length,
        maintainers: pMaintainers,
        developers: pDevelopers,
        pendingInvitations: pInvites.length,
      };
    });

    // Recent activity
    const recentActivity = await auditService.getRecentActivity(
      orgId,
      undefined,
      10,
    );

    return {
      metrics: {
        totalUsers: uniqueUserIds.size,
        activeUsers: uniqueUserIds.size,
        totalProjects: projects.length,
        maintainersCount,
        developersCount,
        pendingInvitationsCount: pendingInvitations.length,
      },
      projectBreakdown,
      recentActivity,
    };
  }

  async getUsers(
    orgId: string,
    filters: {
      projectId?: string;
      role?: string;
      status?: string;
      search?: string;
    } = {},
  ): Promise<any[]> {
    const oId = new Types.ObjectId(orgId);

    // Get all org projects
    const projects = await ProjectModel.find({ organizationId: oId }).lean();

    let targetProjectIds = projects.map((p) => p._id);
    if (filters.projectId && Types.ObjectId.isValid(filters.projectId)) {
      targetProjectIds = targetProjectIds.filter(
        (id) => id.toString() === filters.projectId,
      );
    }

    const membershipQuery: any = {
      projectId: { $in: targetProjectIds },
    };

    if (filters.role) {
      membershipQuery.role = filters.role;
    }
    if (filters.status) {
      membershipQuery.status = filters.status;
    }

    const pMembers = await ProjectMembershipModel.find(membershipQuery)
      .populate("userId", "name email status createdAt")
      .populate("projectId", "name slug status")
      .lean();

    let results = pMembers.map((pm: any) => ({
      membershipId: pm._id,
      user: pm.userId,
      project: pm.projectId,
      role: pm.role,
      status: pm.status,
      joinedAt: pm.joinedAt || pm.createdAt,
    }));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (r) =>
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          r.project?.name?.toLowerCase().includes(q),
      );
    }

    return results;
  }
}

export const organizationService = new OrganizationService();
