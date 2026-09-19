import { Router } from "express";
import { streamChat, getHealth } from "../controllers/chatController.js";

export const chatRouter = Router();

// Chat prompt streaming endpoint (SSE)
chatRouter.post("/stream", streamChat);

// Sub-health check
chatRouter.get("/health", getHealth);
