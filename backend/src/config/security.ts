import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

// SHA-256 hash for tokens (verification, password reset, invitations, session)
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Generate cryptographically secure random token string
export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT helpers
export interface JWTPayload {
  userId: string;
  email: string;
  sessionId?: string;
}

export function signJWT(
  payload: JWTPayload,
  expiresIn: string = "24h",
): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: expiresIn as any });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// AES-256-GCM encryption for integration credentials (GitHub/Jira/Confluence tokens)
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(ENV.SESSION_SECRET)
  .digest(); // 32-byte key

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    ENCRYPTION_ALGORITHM,
    ENCRYPTION_KEY,
    iv,
  );
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSecret(encryptedPayload: string): string {
  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) return "";
    const [ivHex, authTagHex, encryptedText] = parts;
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}
