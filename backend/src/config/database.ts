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

  // Attempt connection to configured MONGODB_URI
  try {
    logger.info(`Attempting connection to MongoDB at: ${ENV.MONGODB_URI}`);
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    logger.info("Connected to external MongoDB successfully.");
    return ENV.MONGODB_URI;
  } catch (err) {
    logger.warn(
      `Could not connect to external MongoDB: ${(err as Error).message}`,
    );
    logger.info("Starting embedded MongoMemoryServer for development...");

    try {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: "devai",
        },
      });
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri);
      logger.info(`Connected to embedded MongoMemoryServer at ${memoryUri}`);
      return memoryUri;
    } catch (memErr) {
      logger.error("Failed to start MongoMemoryServer:", { error: memErr });
      throw memErr;
    }
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
