import { Types } from "mongoose";
import { UserModel, IUser } from "../models/User.js";
import { AuthTokenModel } from "../models/AuthToken.js";
import { SessionModel, ISession } from "../models/Session.js";
import { OrganizationMembershipModel } from "../models/OrganizationMembership.js";
import { ProjectMembershipModel } from "../models/ProjectMembership.js";
import { OutboxEventModel } from "../models/OutboxEvent.js";
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateRandomToken,
  signJWT,
} from "../config/security.js";
import { AppError } from "../middleware/errorHandler.js";
import { ENV } from "../config/env.js";

export class AuthService {
  async signup(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: IUser; verificationToken: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError(
        "CONFLICT",
        "An account with this email already exists.",
        409,
      );
    }

    if (password.length < 8) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Password must be at least 8 characters long.",
        400,
      );
    }

    const passwordHash = await hashPassword(password);
    const user = new UserModel({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      status: "PENDING_VERIFICATION",
    });
    await user.save();

    // Create verification token
    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + ENV.VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const authToken = new AuthTokenModel({
      userId: user._id,
      type: "EMAIL_VERIFICATION",
      tokenHash,
      expiresAt,
    });
    await authToken.save();

    // Create outbox event for email notification
    await OutboxEventModel.create({
      eventType: "VERIFICATION_EMAIL",
      aggregateType: "USER",
      aggregateId: user._id,
      payload: {
        email: user.email,
        token: rawToken,
        name: user.name,
      },
    });

    return { user, verificationToken: rawToken };
  }

  async verifyEmail(email: string, token: string): Promise<IUser> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found.", 404);
    }

    const tokenHash = hashToken(token);
    const authToken = await AuthTokenModel.findOne({
      userId: user._id,
      type: "EMAIL_VERIFICATION",
      tokenHash,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      throw new AppError(
        "INVALID_TOKEN",
        "Verification token is invalid or has expired.",
        400,
      );
    }

    authToken.consumedAt = new Date();
    await authToken.save();

    user.status = "ACTIVE";
    user.emailVerifiedAt = new Date();
    await user.save();

    return user;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: IUser; session: ISession; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password.", 401);
    }

    if (user.status === "DELETED" || user.status === "SUSPENDED") {
      throw new AppError(
        "FORBIDDEN",
        "This account has been deactivated.",
        403,
      );
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError("UNAUTHORIZED", "Invalid email or password.", 401);
    }

    // Create server-side session
    const rawSessionToken = generateRandomToken(32);
    const sessionHash = hashToken(rawSessionToken);
    const expiresAt = new Date(
      Date.now() + ENV.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const session = new SessionModel({
      userId: user._id,
      sessionHash,
      expiresAt,
    });
    await session.save();

    user.lastLoginAt = new Date();
    await user.save();

    const token = signJWT({
      userId: user._id.toString(),
      email: user.email,
      sessionId: session._id.toString(),
    });

    return { user, session, token };
  }

  async logout(sessionId?: string): Promise<void> {
    if (sessionId && Types.ObjectId.isValid(sessionId)) {
      await SessionModel.findByIdAndUpdate(sessionId, {
        revokedAt: new Date(),
      });
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user || user.status === "DELETED") {
      // Return cleanly to prevent email enumeration
      return;
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + ENV.PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await AuthTokenModel.create({
      userId: user._id,
      type: "PASSWORD_RESET",
      tokenHash,
      expiresAt,
    });

    await OutboxEventModel.create({
      eventType: "PASSWORD_RESET",
      aggregateType: "USER",
      aggregateId: user._id,
      payload: {
        email: user.email,
        token: rawToken,
        name: user.name,
      },
    });
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found.", 404);
    }

    if (newPassword.length < 8) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Password must be at least 8 characters long.",
        400,
      );
    }

    const tokenHash = hashToken(token);
    const authToken = await AuthTokenModel.findOne({
      userId: user._id,
      type: "PASSWORD_RESET",
      tokenHash,
      consumedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });

    if (!authToken) {
      throw new AppError(
        "INVALID_TOKEN",
        "Password reset token is invalid or has expired.",
        400,
      );
    }

    authToken.consumedAt = new Date();
    await authToken.save();

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Invalidate all active sessions for security
    await SessionModel.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
    );
  }

  async getMe(userId: string): Promise<{
    user: IUser;
    organizations: any[];
    projects: any[];
  }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found.", 404);
    }

    // Load active organization memberships
    const orgMemberships = await OrganizationMembershipModel.find({
      userId: user._id,
      status: "ACTIVE",
    })
      .populate("organizationId")
      .lean();

    // Load active project memberships
    const projectMemberships = await ProjectMembershipModel.find({
      userId: user._id,
      status: "ACTIVE",
    })
      .populate({
        path: "projectId",
        match: { status: "ACTIVE" },
      })
      .lean();

    // Filter out any populated project that was null (e.g. archived or deleted)
    const validProjects = projectMemberships.filter(
      (pm) => pm.projectId != null,
    );

    return {
      user,
      organizations: orgMemberships,
      projects: validProjects,
    };
  }
}

export const authService = new AuthService();
