import mongoose, { Schema, Types } from "mongoose";

export type OrgRole = "ADMIN" | "MEMBER";
export type MembershipStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";

export interface IOrganizationMembership {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrgRole;
  status: MembershipStatus;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

const OrganizationMembershipSchema = new Schema<IOrganizationMembership>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["ADMIN", "MEMBER"], required: true, default: "MEMBER" },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED", "REMOVED"], required: true, default: "ACTIVE" },
    joinedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
OrganizationMembershipSchema.index({ organizationId: 1, role: 1, status: 1 });
OrganizationMembershipSchema.index({ userId: 1, status: 1 });

export const OrganizationMembershipModel = mongoose.model<IOrganizationMembership>(
  "OrganizationMembership",
  OrganizationMembershipSchema,
  "organization_memberships"
);
