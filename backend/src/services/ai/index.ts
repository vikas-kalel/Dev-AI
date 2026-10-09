import { AIProvider } from "./aiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { MockAIProvider } from "./mockProvider.js";
import { ENV } from "../../config/env.js";

export * from "./aiProvider.js";
export * from "./mockProvider.js";
export * from "./geminiProvider.js";

export const aiProvider: AIProvider = ENV.GEMINI_API_KEY
  ? new GeminiProvider()
  : new MockAIProvider();
