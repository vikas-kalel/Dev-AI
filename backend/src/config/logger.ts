import fs from "fs";
import path from "path";
import winston from "winston";
import type { Request, Response, NextFunction } from "express";
import { ENV } from "./env.js";

const { combine, timestamp, printf, errors, json } = winston.format;

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch {
    // Ignore error if directory creation fails in restricted environments
  }
}

// ── ANSI helpers ────────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const FG = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
} as const;

const BG = {
  red: "\x1b[41m",
  yellow: "\x1b[43m",
  green: "\x1b[42m",
  blue: "\x1b[44m",
  magenta: "\x1b[45m",
  gray: "\x1b[100m",
} as const;

// ── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CONFIG: Record<string, { emoji: string; badge: string }> = {
  error: { emoji: "✖", badge: `${BOLD}${BG.red}${FG.white} ERROR ${RESET}` },
  warn: { emoji: "⚠", badge: `${BOLD}${BG.yellow}\x1b[30m WARN  ${RESET}` },
  info: { emoji: "ℹ", badge: `${BOLD}${BG.blue}${FG.white}  INFO  ${RESET}` },
  http: {
    emoji: "⇄",
    badge: `${BOLD}${BG.magenta}${FG.white}  HTTP  ${RESET}`,
  },
  debug: { emoji: "⬡", badge: `${BOLD}${BG.gray}${FG.white} DEBUG ${RESET}` },
};

// ── Pretty dev format ─────────────────────────────────────────────────────────
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const cfg = LEVEL_CONFIG[level] ?? { emoji: "·", badge: `[${level}]` };
  const service = meta.service as string | undefined;
  delete meta.service;

  // Timestamp  dim gray
  const ts = `${DIM}${FG.gray}${timestamp}${RESET}`;

  // Service tag  cyan
  const svcTag = service ? ` ${FG.cyan}${BOLD}[${service}]${RESET}` : "";

  // Meta block — only if there's something meaningful
  const metaKeys = Object.keys(meta);
  let metaBlock = "";
  if (metaKeys.length > 0) {
    const lines = metaKeys.map(
      (k) =>
        `   ${DIM}${FG.gray}${k}:${RESET} ${FG.white}${JSON.stringify(meta[k])}${RESET}`,
    );
    metaBlock = `\n${lines.join("\n")}`;
  }

  // Stack trace  red dim
  const body = stack
    ? `${FG.red}${stack}${RESET}`
    : `${FG.white}${message}${RESET}`;

  return `${ts} ${cfg.badge}${svcTag} ${body}${metaBlock}`;
});

// Configure Winston Logger
export const logger = winston.createLogger({
  level: ENV.NODE_ENV === "development" ? "debug" : "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    errors({ stack: true }),
    ENV.NODE_ENV === "production" ? json() : devFormat,
  ),
  defaultMeta: { service: "devai-backend" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// --- Sensitive field sanitizer ---
// Strips known secret fields from request bodies before logging
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "sessionHash",
  "tokenHash",
]);

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_KEYS.has(key.toLowerCase())
      ? "[REDACTED]"
      : value;
  }
  return sanitized;
}

// ── HTTP method color map ────────────────────────────────────────────────────
const METHOD_COLOR: Record<string, string> = {
  GET: FG.green,
  POST: FG.blue,
  PUT: FG.yellow,
  PATCH: FG.magenta,
  DELETE: FG.red,
};

// --- Skipped routes for noise reduction ---
const SKIP_LOG_ROUTES = new Set(["/health", "/ready", "/api/health"]);

function colorMethod(method: string): string {
  const c = METHOD_COLOR[method] ?? FG.white;
  return `${BOLD}${c}${method.padEnd(6)}${RESET}`;
}

function colorStatus(code: number): string {
  if (code >= 500) return `${BOLD}${FG.red}${code}${RESET}`;
  if (code >= 400) return `${BOLD}${FG.yellow}${code}${RESET}`;
  if (code >= 300) return `${BOLD}${FG.cyan}${code}${RESET}`;
  return `${BOLD}${FG.green}${code}${RESET}`;
}

// ── HTTP Request + Response Logger Middleware ──────────────────────────────
// Logs: incoming request (method, url, params, sanitized body, user)
//        outgoing response (status, duration)
//        errors are logged in errorHandler with full context
// ──────────────────────────────────────────────────────────────────────────
export function httpLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const requestId = (req as any).requestId || "";

  // Skip noisy health-check routes
  if (SKIP_LOG_ROUTES.has(req.originalUrl?.split("?")[0])) {
    return next();
  }

  // ── 1. Log INCOMING REQUEST ──────────────────────────────────────────────
  const userId =
    (req as any).userId || (req as any).user?._id?.toString() || undefined;

  const requestMeta: Record<string, unknown> = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userId,
  };

  // Include query params if any
  if (req.query && Object.keys(req.query).length > 0) {
    requestMeta.query = req.query;
  }

  // Include sanitized body for mutating methods
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.body &&
    Object.keys(req.body).length > 0
  ) {
    requestMeta.body = sanitizeBody(req.body);
  }

  // Include route params if populated
  if (req.params && Object.keys(req.params).length > 0) {
    requestMeta.params = req.params;
  }

  logger.info(
    `${FG.cyan}→${RESET} ${colorMethod(req.method)} ${FG.white}${req.originalUrl}${RESET}`,
    requestMeta,
  );

  // ── 2. Log OUTGOING RESPONSE ─────────────────────────────────────────────
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Try to capture authenticated user (populated after auth middleware runs)
    const resolvedUserId = (req as any).userId || userId;

    const responseMeta: Record<string, unknown> = {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs: duration,
      ip: req.ip,
      userId: resolvedUserId,
      userAgent: req.get("user-agent") || undefined,
    };

    // Duration color: green < 200ms, yellow < 1s, red >= 1s
    const durationColor =
      duration < 200 ? FG.green : duration < 1000 ? FG.yellow : FG.red;
    const durationStr = `${durationColor}${duration}ms${RESET}`;

    const message =
      `${FG.cyan}←${RESET} ${colorMethod(req.method)} ` +
      `${FG.white}${req.originalUrl}${RESET} ` +
      `${colorStatus(statusCode)} ${DIM}(${durationStr}${DIM})${RESET}`;

    if (statusCode >= 500) {
      logger.error(message, responseMeta);
    } else if (statusCode >= 400) {
      logger.warn(message, responseMeta);
    } else {
      logger.info(message, responseMeta);
    }
  });

  next();
}
