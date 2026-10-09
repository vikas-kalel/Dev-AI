import mongoose, { Schema, Document, Types } from "mongoose";

export type OrganizationStatus = "ACTIVE" | "ARCHIVED";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdBy: Types.ObjectId;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const OrganizationModel = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
  "organizations",
);
