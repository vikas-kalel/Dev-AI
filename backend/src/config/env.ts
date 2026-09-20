import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devai",
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "dev-ai-super-secret-jwt-key-change-in-production-2026",
  SESSION_SECRET:
    process.env.SESSION_SECRET || "dev-ai-session-cookie-secret-key-2026",
  COOKIE_NAME: "devai_session",
  TOKEN_EXPIRY_HOURS: 24,
  VERIFICATION_TOKEN_EXPIRY_HOURS: 24,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 2,
  INVITATION_EXPIRY_DAYS: 7,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "Dev AI Workspace <no-reply@devai.local>",
  APP_URL: process.env.APP_URL || "http://localhost:5173",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
};
