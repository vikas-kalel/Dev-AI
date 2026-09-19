import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

// Supported active models: gemini-3.1-flash-lite and gemini-3.6-flash provide high throughput & availability
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. Please configure it in Settings > Secrets."
    );
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return aiClient;
}
