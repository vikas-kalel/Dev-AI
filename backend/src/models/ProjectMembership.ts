import mongoose, { Schema, Types } from "mongoose";
import { MembershipStatus } from "./OrganizationMembership.js";

export type ProjectRole = "MAINTAINER" | "DEVELOPER";

export interface IProjectMembership {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  role: ProjectRole;
  status: MembershipStatus;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const ProjectMembershipSchema = new Schema<IProjectMembership>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["MAINTAINER", "DEVELOPER"],
      required: true,
      default: "DEVELOPER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "REMOVED"],
      required: true,
      default: "ACTIVE",
    },
    joinedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

ProjectMembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMembershipSchema.index({ projectId: 1, role: 1, status: 1 });
ProjectMembershipSchema.index({ userId: 1, status: 1 });

export const ProjectMembershipModel = mongoose.model<IProjectMembership>(
  "ProjectMembership",
  ProjectMembershipSchema,
  "project_memberships",
);
