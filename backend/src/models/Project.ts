import mongoose, { Schema, Document, Types } from "mongoose";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export interface IProject extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ organizationId: 1, slug: 1 }, { unique: true });
ProjectSchema.index({ organizationId: 1, status: 1 });

export const ProjectModel = mongoose.model<IProject>("Project", ProjectSchema, "projects");
