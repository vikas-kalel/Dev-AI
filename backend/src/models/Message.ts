import mongoose, { Schema, Types } from "mongoose";

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
export type MessageStatus = "DONE" | "STREAMING" | "PARTIAL" | "FAILED";

export interface IMessage {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
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
    role: {
      type: String,
      enum: ["USER", "ASSISTANT", "SYSTEM", "TOOL"],
      required: true,
    },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["DONE", "STREAMING", "PARTIAL", "FAILED"],
      default: "DONE",
    },
    model: { type: String },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const MessageModel = mongoose.model<IMessage>(
  "Message",
  MessageSchema,
  "messages",
);
