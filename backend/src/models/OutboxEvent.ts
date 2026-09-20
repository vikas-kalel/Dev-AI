import mongoose, { Schema, Document, Types } from "mongoose";

export type OutboxStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface IOutboxEvent extends Document {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  eventType: string;
  aggregateType: string;
  aggregateId: Types.ObjectId;
  payload: Record<string, any>;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt?: Date;
  processedAt?: Date;
  lastError?: string;
  createdAt: Date;
}

const OutboxEventSchema = new Schema<IOutboxEvent>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    eventType: { type: String, required: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: Schema.Types.ObjectId, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    lastError: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

OutboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
OutboxEventSchema.index({ aggregateType: 1, aggregateId: 1 });

export const OutboxEventModel = mongoose.model<IOutboxEvent>(
  "OutboxEvent",
  OutboxEventSchema,
  "outbox_events"
);
