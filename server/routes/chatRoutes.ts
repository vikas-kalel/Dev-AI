import { Router } from "express";
import { askChat, streamChat, getHealth } from "../controllers/chatController.js";

export const chatRouter = Router();

// Chat prompt streaming endpoint (SSE)
chatRouter.post("/stream", streamChat);

// Chat prompt fallback non-streaming endpoint
chatRouter.post("/ask", askChat);

// Sub-health check
chatRouter.get("/health", getHealth);
