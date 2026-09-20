import mongoose, { Schema, Document, Types } from "mongoose";

export type AttachmentProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

export interface IConversationAttachment extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  conversationId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  processingStatus: AttachmentProcessingStatus;
  expiresAt?: Date;
  createdAt: Date;
}

const ConversationAttachmentSchema = new Schema<IConversationAttachment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    storageKey: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    processingStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "READY", "FAILED"],
      default: "READY",
      index: true,
    },
    expiresAt: { type: Date, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ConversationAttachmentSchema.index({ conversationId: 1, createdAt: -1 });

export const ConversationAttachmentModel =
  mongoose.model<IConversationAttachment>(
    "ConversationAttachment",
    ConversationAttachmentSchema,
    "conversation_attachments",
  );
