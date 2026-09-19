import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chatRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { getHealth } from "./controllers/chatController.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Enable CORS for frontend development
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

// Routes
app.get("/api/health", getHealth);
app.use("/api/chat", chatRouter);

// Error Handler
app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
