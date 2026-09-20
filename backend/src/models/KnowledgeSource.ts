import mongoose, { Schema, Document, Types } from "mongoose";

export type KnowledgeSourceType = "GITHUB" | "JIRA" | "CONFLUENCE" | "MANUAL";
export type KnowledgeSourceStatus =
  | "CONNECTED"
  | "SYNCING"
  | "ERROR"
  | "DISCONNECTED";

export interface IKnowledgeSource extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  type: KnowledgeSourceType;
  name: string;
  status: KnowledgeSourceStatus;
  configEncrypted?: string;
  metadata?: Record<string, unknown>;
  lastSyncedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSourceSchema = new Schema<IKnowledgeSource>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    type: {
      type: String,
      enum: ["GITHUB", "JIRA", "CONFLUENCE", "MANUAL"],
      required: true,
    },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["CONNECTED", "SYNCING", "ERROR", "DISCONNECTED"],
      default: "CONNECTED",
      index: true,
    },
    configEncrypted: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastSyncedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  },
);

KnowledgeSourceSchema.index({ projectId: 1, type: 1, status: 1 });

export const KnowledgeSourceModel = mongoose.model<IKnowledgeSource>(
  "KnowledgeSource",
  KnowledgeSourceSchema,
  "knowledge_sources",
);
