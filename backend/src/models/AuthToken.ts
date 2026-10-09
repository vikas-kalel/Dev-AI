import mongoose, { Schema, Document, Types } from "mongoose";

export type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export interface IAuthToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt: Date;
}

const AuthTokenSchema = new Schema<IAuthToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
    },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    consumedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

AuthTokenSchema.index({ userId: 1, type: 1, consumedAt: 1 });

export const AuthTokenModel = mongoose.model<IAuthToken>(
  "AuthToken",
  AuthTokenSchema,
  "auth_tokens",
);
