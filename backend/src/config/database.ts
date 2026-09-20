import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { ENV } from "./env.js";
import { logger } from "./logger.js";

let memoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<string> {
  // If already connected, return existing URI
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.host;
  }

  // Check if MONGODB_URI still contains unreplaced placeholder
  if (
    ENV.MONGODB_URI.includes("<db_password>") ||
    ENV.MONGODB_URI.includes("<password>")
  ) {
    logger.warn(
      "MONGODB_URI contains a '<db_password>' placeholder. Please replace it with your Atlas password in backend/.env. Falling back to local disk persistence.",
    );
  } else {
    // Attempt connection to configured external MONGODB_URI
    try {
      logger.info(`Attempting connection to MongoDB at: ${ENV.MONGODB_URI}`);
      await mongoose.connect(ENV.MONGODB_URI, {
        serverSelectionTimeoutMS: 3000,
      });
      logger.info("Connected to external MongoDB successfully.");
      return ENV.MONGODB_URI;
    } catch (err) {
      logger.warn(
        `Could not connect to external MongoDB at ${ENV.MONGODB_URI}: ${(err as Error).message}`,
      );
    }
  }

  logger.info(
    "Starting embedded MongoDB with disk persistence for local development...",
  );

  try {
    // Create persistent database directory on disk so data survives server restarts
    const dbDir = path.resolve(process.cwd(), "data/db");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: "devai",
        dbPath: dbDir,
        storageEngine: "wiredTiger",
      },
    });

    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    logger.info(
      `Connected to embedded persistent MongoDB at ${memoryUri} (disk storage: ${dbDir})`,
    );
    return memoryUri;
  } catch (memErr) {
    logger.error("Failed to start embedded persistent MongoDB:", {
      error: memErr,
    });
    throw memErr;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
