import { Types } from "mongoose";
import { ProjectModel } from "../models/Project.js";
import { ProjectMembershipModel, IProjectMembership, ProjectRole } from "../models/ProjectMembership.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { UserModel } from "../models/User.js";
import { OutboxEventModel } from "../models/OutboxEvent.js";
import { auditService } from "./auditService.js";
import { assertNotLastMaintainer } from "../policies/invariants.js";
import { invitationService } from "./invitationService.js";
import { AppError } from "../middleware/errorHandler.js";

export class MembershipService {
  async listMembers(projectId: string): Promise<any[]> {
    const pId = new Types.ObjectId(projectId);

    // Active project members
    const members = await ProjectMembershipModel.find({
      projectId: pId,
      status: "ACTIVE",
    })
      .populate("userId", "name email status createdAt")
      .lean();

    return members.map((m: any) => ({
      _id: m._id,
      userId: m.userId?._id,
      name: m.userId?.name,
      email: m.userId?.email,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt || m.createdAt,
    }));
  }

  async addMember(
    projectId: string,
    email: string,
    role: ProjectRole,
    actorUserId: string
  ): Promise<{ type: "MEMBERSHIP" | "INVITATION"; data: any }> {
    const normalizedEmail = email.toLowerCase().trim();
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    const actor = await UserModel.findById(actorUserId);
    const existingUser = await UserModel.findOne({ email: normalizedEmail });

    if (!existingUser) {
      // User doesn't exist yet, issue invitation
      const invite = await invitationService.createInvitation(
        project.organizationId.toString(),
        projectId,
        normalizedEmail,
        role,
        actorUserId
      );
      return { type: "INVITATION", data: invite };
    }

    // Existing user: check if already member
    const existingMembership = await ProjectMembershipModel.findOne({
      projectId: project._id,
      userId: existingUser._id,
    });

    if (existingMembership && existingMembership.status === "ACTIVE") {
      throw new AppError("CONFLICT", "User is already an active member of this project.", 409);
    }

    // Ensure user has OrganizationMembership
    const orgMem = await OrganizationMembershipModel.findOne({
      organizationId: project.organizationId,
      userId: existingUser._id,
    });
    if (!orgMem) {
      await OrganizationMembershipModel.create({
        organizationId: project.organizationId,
        userId: existingUser._id,
        role: "MEMBER",
        status: "ACTIVE",
      });
    }

    let membership: IProjectMembership;
    if (existingMembership) {
      existingMembership.status = "ACTIVE";
      existingMembership.role = role;
      existingMembership.joinedAt = new Date();
      existingMembership.version += 1;
      membership = await existingMembership.save();
    } else {
      membership = await ProjectMembershipModel.create({
        projectId: project._id,
        userId: existingUser._id,
        role,
        status: "ACTIVE",
      });
    }

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(actorUserId),
      action: "MEMBER_ADDED",
      targetType: "USER",
      targetId: existingUser._id,
      metadata: { role, email: normalizedEmail },
    });

    await OutboxEventModel.create({
      organizationId: project.organizationId,
      eventType: "ROLE_CHANGED",
      aggregateType: "PROJECT_MEMBERSHIP",
      aggregateId: membership._id,
      payload: {
        email: normalizedEmail,
        projectName: project.name,
        newRole: role,
        actorName: actor?.name || "Admin",
      },
    });

    return { type: "MEMBERSHIP", data: membership };
  }

  async changeRole(
    projectId: string,
    targetUserId: string,
    newRole: ProjectRole,
    actorUserId: string
  ): Promise<IProjectMembership> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    const membership = await ProjectMembershipModel.findOne({
      projectId: project._id,
      userId: new Types.ObjectId(targetUserId),
      status: "ACTIVE",
    });

    if (!membership) {
      throw new AppError("NOT_FOUND", "User is not an active member of this project.", 404);
    }

    if (membership.role === newRole) {
      return membership;
    }

    // Invariant check: If demoting Maintainer to Developer, verify target is not last Maintainer!
    if (membership.role === "MAINTAINER" && newRole === "DEVELOPER") {
      await assertNotLastMaintainer(projectId, targetUserId);
    }

    const previousRole = membership.role;
    membership.role = newRole;
    membership.version += 1;
    await membership.save();

    const targetUser = await UserModel.findById(targetUserId);
    const actor = await UserModel.findById(actorUserId);

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(actorUserId),
      action: "ROLE_CHANGED",
      targetType: "USER",
      targetId: new Types.ObjectId(targetUserId),
      metadata: { previousRole, newRole },
    });

    if (targetUser) {
      await OutboxEventModel.create({
        organizationId: project.organizationId,
        eventType: "ROLE_CHANGED",
        aggregateType: "PROJECT_MEMBERSHIP",
        aggregateId: membership._id,
        payload: {
          email: targetUser.email,
          projectName: project.name,
          newRole,
          actorName: actor?.name || "Admin",
        },
      });
    }

    return membership;
  }

  async removeMember(
    projectId: string,
    targetUserId: string,
    actorUserId: string
  ): Promise<void> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    const membership = await ProjectMembershipModel.findOne({
      projectId: project._id,
      userId: new Types.ObjectId(targetUserId),
      status: "ACTIVE",
    });

    if (!membership) {
      throw new AppError("NOT_FOUND", "User is not an active member of this project.", 404);
    }

    // Invariant check: Cannot remove the last Maintainer!
    if (membership.role === "MAINTAINER") {
      await assertNotLastMaintainer(projectId, targetUserId);
    }

    membership.status = "REMOVED";
    membership.version += 1;
    await membership.save();

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(actorUserId),
      action: "MEMBER_REMOVED",
      targetType: "USER",
      targetId: new Types.ObjectId(targetUserId),
      metadata: { role: membership.role },
    });
  }
}

export const membershipService = new MembershipService();
