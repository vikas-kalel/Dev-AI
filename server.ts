import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { chatRouter } from "./backend/src/routes/chatRoutes.js";
import { errorHandler } from "./backend/src/middleware/errorHandler.js";
import { getHealth } from "./backend/src/controllers/chatController.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json({ limit: "2mb" }));

  // REST API Routes FIRST
  app.get("/api/health", getHealth);
  app.use("/api/chat", chatRouter);

  // Vite middleware in dev / static serve in prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // In Express v4, wildcard is '*'
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
