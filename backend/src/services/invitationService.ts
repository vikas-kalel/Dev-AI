import { Types } from "mongoose";
import { InvitationModel, IInvitation } from "../models/Invitation.js";
import { ProjectModel } from "../models/Project.js";
import {
  ProjectMembershipModel,
  ProjectRole,
} from "../models/ProjectMembership.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { UserModel } from "../models/User.js";
import { OutboxEventModel } from "../models/OutboxEvent.js";
import { auditService } from "./auditService.js";
import { hashToken, generateRandomToken } from "../config/security.js";
import { AppError } from "../middleware/errorHandler.js";
import { ENV } from "../config/env.js";

export class InvitationService {
  async createInvitation(
    orgId: string,
    projectId: string,
    email: string,
    invitedRole: ProjectRole,
    actorUserId: string,
  ): Promise<{ invitation: IInvitation; rawToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    const actor = await UserModel.findById(actorUserId);

    // Revoke any previous pending invitation for this email in this project
    await InvitationModel.updateMany(
      { projectId: project._id, email: normalizedEmail, status: "PENDING" },
      { status: "REVOKED" },
    );

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + ENV.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    const invitation = await InvitationModel.create({
      organizationId: new Types.ObjectId(orgId),
      projectId: project._id,
      email: normalizedEmail,
      invitedRole,
      tokenHash,
      status: "PENDING",
      invitedBy: new Types.ObjectId(actorUserId),
      expiresAt,
    });

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(actorUserId),
      action: "MEMBER_INVITED",
      targetType: "INVITATION",
      targetId: invitation._id,
      metadata: { email: normalizedEmail, role: invitedRole },
    });

    await OutboxEventModel.create({
      organizationId: project.organizationId,
      eventType: "INVITATION_SENT",
      aggregateType: "INVITATION",
      aggregateId: invitation._id,
      payload: {
        email: normalizedEmail,
        token: rawToken,
        projectName: project.name,
        role: invitedRole,
        inviterName: actor?.name || "DevAI Administrator",
      },
    });

    return { invitation, rawToken };
  }

  async getInvitationByToken(token: string): Promise<any> {
    const tokenHash = hashToken(token);
    const invitation = await InvitationModel.findOne({ tokenHash })
      .populate("projectId", "name slug description")
      .populate("organizationId", "name slug")
      .populate("invitedBy", "name email")
      .lean();

    if (!invitation) {
      throw new AppError(
        "NOT_FOUND",
        "Invitation not found or invalid token.",
        404,
      );
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(
        "INVALID_INVITATION",
        `This invitation has already been ${invitation.status.toLowerCase()}.`,
        400,
      );
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await InvitationModel.findByIdAndUpdate(invitation._id, {
        status: "EXPIRED",
      });
      throw new AppError(
        "EXPIRED_INVITATION",
        "This invitation has expired. Ask an administrator for a new invite.",
        400,
      );
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<any> {
    const tokenHash = hashToken(token);
    const invitation = await InvitationModel.findOne({ tokenHash });

    if (!invitation) {
      throw new AppError(
        "NOT_FOUND",
        "Invitation not found or invalid token.",
        404,
      );
    }

    if (invitation.status !== "PENDING") {
      throw new AppError(
        "INVALID_INVITATION",
        `This invitation is ${invitation.status.toLowerCase()}.`,
        400,
      );
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "EXPIRED";
      await invitation.save();
      throw new AppError(
        "EXPIRED_INVITATION",
        "This invitation has expired.",
        400,
      );
    }

    const uId = new Types.ObjectId(userId);
    const user = await UserModel.findById(uId);
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found.", 404);
    }

    // Mark invitation accepted
    invitation.status = "ACCEPTED";
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Ensure Organization Membership
    const existingOrgMem = await OrganizationMembershipModel.findOne({
      organizationId: invitation.organizationId,
      userId: uId,
    });
    if (!existingOrgMem) {
      await OrganizationMembershipModel.create({
        organizationId: invitation.organizationId,
        userId: uId,
        role: "MEMBER",
        status: "ACTIVE",
      });
    }

    // Create or reactivate Project Membership
    const existingProjectMem = await ProjectMembershipModel.findOne({
      projectId: invitation.projectId,
      userId: uId,
    });

    let projectMembership;
    if (existingProjectMem) {
      existingProjectMem.status = "ACTIVE";
      existingProjectMem.role = invitation.invitedRole;
      existingProjectMem.joinedAt = new Date();
      existingProjectMem.version += 1;
      projectMembership = await existingProjectMem.save();
    } else {
      projectMembership = await ProjectMembershipModel.create({
        projectId: invitation.projectId,
        userId: uId,
        role: invitation.invitedRole,
        status: "ACTIVE",
      });
    }

    await auditService.log({
      organizationId: invitation.organizationId,
      projectId: invitation.projectId,
      actorUserId: uId,
      action: "INVITATION_ACCEPTED",
      targetType: "INVITATION",
      targetId: invitation._id,
      metadata: { role: invitation.invitedRole },
    });

    return projectMembership;
  }

  async resendInvitation(
    invitationId: string,
    actorUserId: string,
  ): Promise<string> {
    const invitation = await InvitationModel.findById(invitationId);
    if (!invitation) {
      throw new AppError("NOT_FOUND", "Invitation not found.", 404);
    }

    const project = await ProjectModel.findById(invitation.projectId);
    const actor = await UserModel.findById(actorUserId);

    const rawToken = generateRandomToken(32);
    invitation.tokenHash = hashToken(rawToken);
    invitation.status = "PENDING";
    invitation.expiresAt = new Date(
      Date.now() + ENV.INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await invitation.save();

    await OutboxEventModel.create({
      organizationId: invitation.organizationId,
      eventType: "INVITATION_SENT",
      aggregateType: "INVITATION",
      aggregateId: invitation._id,
      payload: {
        email: invitation.email,
        token: rawToken,
        projectName: project?.name || "Project",
        role: invitation.invitedRole,
        inviterName: actor?.name || "DevAI Administrator",
      },
    });

    return rawToken;
  }

  async revokeInvitation(
    invitationId: string,
    actorUserId: string,
  ): Promise<void> {
    const invitation = await InvitationModel.findById(invitationId);
    if (!invitation) {
      throw new AppError("NOT_FOUND", "Invitation not found.", 404);
    }

    invitation.status = "REVOKED";
    await invitation.save();

    await auditService.log({
      organizationId: invitation.organizationId,
      projectId: invitation.projectId,
      actorUserId: new Types.ObjectId(actorUserId),
      action: "INVITATION_REVOKED",
      targetType: "INVITATION",
      targetId: invitation._id,
      metadata: { email: invitation.email },
    });
  }
}

export const invitationService = new InvitationService();
