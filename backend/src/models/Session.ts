import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  sessionHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  lastSeenAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    lastSeenAt: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const SessionModel = mongoose.model<ISession>(
  "Session",
  SessionSchema,
  "sessions",
);
