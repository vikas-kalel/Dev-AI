import {
  getGeminiClient,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
} from "../config/gemini.js";
import { logger } from "../config/logger.js";

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface HistoryItem {
  role: "user" | "assistant" | "model";
  content?: string;
  parts?: Array<{ text: string }>;
}

export interface GenerateChatOptions {
  prompt: string;
  history?: HistoryItem[];
  model?: string;
  systemInstruction?: string;
}

export interface ChatResponseResult {
  text: string;
  model: string;
  timestamp: string;
  tokens: number;
  durationMs: number;
}

const DEFAULT_SYSTEM_INSTRUCTION =
  "You are DevAI, a premier high-throughput developer inference assistant for software engineering, systems architecture, algorithms, and code generation. " +
  "Provide clear, precise, and highly technical responses. Format code blocks cleanly with appropriate language tags (e.g. ```typescript, ```python). " +
  "Be concise, direct, and rigorous without unnecessary fluff.";

/**
 * Context Window Guardrails:
 * - MAX_HISTORY_MESSAGES: Limits sliding window to the most recent 10 turns (5 full conversation rounds).
 * - MAX_HISTORY_CHAR_BUDGET: Caps historical character context (~8,000 tokens) to prevent latency degradation and cost runaway.
 * - MAX_SINGLE_TURN_CHARS: Protects against huge single pasted files in earlier turns.
 */
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHAR_BUDGET = 32000;
const MAX_SINGLE_TURN_CHARS = 8000;

function isTransientOrCapacityError(error: unknown): boolean {
  if (!error) return false;
  const str = String(error);
  const msg = error instanceof Error ? error.message : "";
  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: number;
  };

  if (errObj.status === 503 || errObj.statusCode === 503 || errObj.code === 503)
    return true;
  if (errObj.status === 429 || errObj.statusCode === 429 || errObj.code === 429)
    return true;

  return (
    str.includes("503") ||
    str.includes("high demand") ||
    str.includes("UNAVAILABLE") ||
    str.includes("overloaded") ||
    str.includes("RESOURCE_EXHAUSTED") ||
    str.includes("temporarily unavailable") ||
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE")
  );
}

/**
 * Prunes conversation history using a sliding window and character budget,
 * then maps it to the schema expected by the Gemini API.
 */
function formatContents(prompt: string, history: HistoryItem[] = []) {
  if (!history || history.length === 0) {
    return prompt;
  }

  // 1. Sliding Message Window: Keep only the most recent N turns
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

  // 2. Sliding Character Budget: Evaluate from newest to oldest
  let accumulatedChars = prompt.length;
  const prunedItems: Array<{ role: "user" | "model"; text: string }> = [];

  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const item = recentHistory[i];
    let text = "";

    if (Array.isArray(item.parts) && item.parts.length > 0) {
      text = item.parts.map((p) => p.text).join("\n");
    } else {
      text = item.content || "";
    }

    text = text.trim();
    if (!text) continue;

    // Truncate overly long single historical turns (e.g. huge code dumps)
    if (text.length > MAX_SINGLE_TURN_CHARS) {
      text =
        text.slice(0, MAX_SINGLE_TURN_CHARS) + "\n...[truncated older context]";
    }

    if (accumulatedChars + text.length > MAX_HISTORY_CHAR_BUDGET) {
      break; // Budget reached, skip older messages
    }

    accumulatedChars += text.length;
    const role: "user" | "model" =
      item.role === "assistant" || item.role === "model" ? "model" : "user";

    // Insert at front to maintain chronological order
    prunedItems.unshift({ role, text });
  }

  // 3. Format into Gemini Content array
  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const msg of prunedItems) {
    contents.push({
      role: msg.role,
      parts: [{ text: msg.text }],
    });
  }

  // 4. Append the current user prompt
  contents.push({
    role: "user",
    parts: [{ text: prompt }],
  });

  return contents;
}

export async function generateChatResponse(
  options: GenerateChatOptions,
): Promise<ChatResponseResult> {
  const {
    prompt,
    history = [],
    model: requestedModel,
    systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  } = options;

  const ai = getGeminiClient();

  // Deduplicate models candidate list
  const initialModel = requestedModel || DEFAULT_MODEL;
  const modelsToTry = Array.from(new Set([initialModel, ...FALLBACK_MODELS]));

  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const startTime = Date.now();
    try {
      const contents = formatContents(prompt, history);

      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || "No response generated.";
      const durationMs = Date.now() - startTime;
      const promptTokens = response.usageMetadata?.promptTokenCount || 0;
      const candidateTokens = response.usageMetadata?.candidatesTokenCount || 0;
      const tokens =
        response.usageMetadata?.totalTokenCount ||
        (promptTokens + candidateTokens > 0
          ? promptTokens + candidateTokens
          : Math.max(1, Math.round((prompt.length + text.length) / 4)));

      return {
        text,
        model: currentModel,
        timestamp: new Date().toISOString(),
        tokens,
        durationMs,
      };
    } catch (err) {
      lastError = err;
      logger.warn(`[GeminiService] Model "${currentModel}" failed`, {
        model: currentModel,
        error: err instanceof Error ? err.message : String(err),
      });

      if (isTransientOrCapacityError(err) && i < modelsToTry.length - 1) {
        logger.warn(
          `[GeminiService] Transient/capacity error on ${currentModel}. Falling back to ${modelsToTry[i + 1]}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      if (i < modelsToTry.length - 1) {
        continue;
      }
      break;
    }
  }

  throw (
    lastError ||
    new Error("Failed to generate response after all model fallback attempts.")
  );
}

export async function generateChatStream(
  options: GenerateChatOptions,
  onChunk: (text: string) => void,
  isAborted?: () => boolean,
): Promise<{
  totalText: string;
  tokens: number;
  durationMs: number;
  model: string;
}> {
  const {
    prompt,
    history = [],
    model: requestedModel,
    systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  } = options;

  const ai = getGeminiClient();

  const initialModel = requestedModel || DEFAULT_MODEL;
  const modelsToTry = Array.from(new Set([initialModel, ...FALLBACK_MODELS]));

  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    if (isAborted?.()) {
      return { totalText: "", tokens: 0, durationMs: 0, model: initialModel };
    }

    const currentModel = modelsToTry[i];
    const startTime = Date.now();
    try {
      const contents = formatContents(prompt, history);

      const responseStream = await ai.models.generateContentStream({
        model: currentModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      let fullText = "";
      let totalTokens = 0;

      for await (const chunk of responseStream) {
        if (isAborted?.()) {
          break;
        }

        const chunkText = chunk.text || "";
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }

        if (chunk.usageMetadata) {
          const tt = chunk.usageMetadata.totalTokenCount || 0;
          const pt = chunk.usageMetadata.promptTokenCount || 0;
          const ct = chunk.usageMetadata.candidatesTokenCount || 0;
          if (tt > 0 || pt + ct > 0) {
            totalTokens = tt || pt + ct;
          }
        }

        if (isAborted?.()) {
          break;
        }
      }

      const durationMs = Date.now() - startTime;
      if (totalTokens === 0) {
        totalTokens = Math.max(
          1,
          Math.round((prompt.length + fullText.length) / 4),
        );
      }

      return {
        totalText: fullText,
        tokens: totalTokens,
        durationMs,
        model: currentModel,
      };
    } catch (err) {
      lastError = err;
      logger.warn(`[GeminiService Stream] Model "${currentModel}" failed`, {
        model: currentModel,
        error: err instanceof Error ? err.message : String(err),
      });

      if (isTransientOrCapacityError(err) && i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      if (i < modelsToTry.length - 1) {
        continue;
      }
      break;
    }
  }

  throw (
    lastError ||
    new Error("Failed to stream response after all model fallback attempts.")
  );
}
