import mongoose, { Schema, Document, Types } from "mongoose";

export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DELETED";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  status: UserStatus;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DELETED"],
      default: "PENDING_VERIFICATION",
      index: true,
    },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model<IUser>("User", UserSchema, "users");
