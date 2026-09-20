import mongoose, { Schema, Document, Types } from "mongoose";

export type ConversationStatus = "ACTIVE" | "ARCHIVED";

export interface IConversation extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Conversation", trim: true },
    status: { type: String, enum: ["ACTIVE", "ARCHIVED"], default: "ACTIVE", index: true },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ projectId: 1, userId: 1, updatedAt: -1 });
ConversationSchema.index({ organizationId: 1, projectId: 1 });

export const ConversationModel = mongoose.model<IConversation>("Conversation", ConversationSchema, "conversations");
