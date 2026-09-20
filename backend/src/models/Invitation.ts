import mongoose, { Schema, Document, Types } from "mongoose";
import { ProjectRole } from "./ProjectMembership.js";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  email: string;
  invitedRole: ProjectRole;
  tokenHash: string;
  status: InvitationStatus;
  invitedBy: Types.ObjectId;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedRole: { type: String, enum: ["MAINTAINER", "DEVELOPER"], required: true },
    tokenHash: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"],
      default: "PENDING",
      index: true,
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true, index: true },
    acceptedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

InvitationSchema.index({ projectId: 1, email: 1, status: 1 });

export const InvitationModel = mongoose.model<IInvitation>("Invitation", InvitationSchema, "invitations");
