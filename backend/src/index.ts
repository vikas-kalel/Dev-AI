import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ENV } from "./config/env.js";
import { logger, httpLogger } from "./config/logger.js";
import { connectDatabase } from "./config/database.js";
import { emailWorker } from "./workers/emailWorker.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { authenticateToken } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getHealth, getReady } from "./controllers/healthController.js";
import { v1Router } from "./routes/index.js";
import { chatRouter } from "./routes/chatRoutes.js";

const app = express();
const PORT = ENV.PORT;

// Enable CORS for frontend development with credentials
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(httpLogger);
app.use(authenticateToken);

// Observability Endpoints
app.get("/health", getHealth);
app.get("/ready", getReady);
app.get("/api/health", getHealth);

// Versioned API v1
app.use("/api/v1", v1Router);

// Legacy chat router for backwards compatibility
app.use("/api/chat", chatRouter);

// Error Handler Middleware
app.use(errorHandler);

// Bootstrap Server & Background Workers
async function bootstrap() {
  try {
    await connectDatabase();

    // Start background outbox email worker
    emailWorker.start();

    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on http://0.0.0.0:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API v1: http://localhost:${PORT}/api/v1`);
    });
  } catch (err) {
    logger.error("Failed to bootstrap server", { error: err });
    process.exit(1);
  }
}

bootstrap();
