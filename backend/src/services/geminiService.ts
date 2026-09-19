import {
  getGeminiClient,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
} from "../config/gemini.js";

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

function formatContents(prompt: string, history: HistoryItem[] = []) {
  if (history.length === 0) {
    return prompt;
  }

  const contents: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  for (const msg of history) {
    const role =
      msg.role === "assistant" || msg.role === "model" ? "model" : "user";
    if (Array.isArray(msg.parts) && msg.parts.length > 0) {
      contents.push({ role, parts: msg.parts });
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content || "" }],
      });
    }
  }

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
      console.warn(`[GeminiService] Model "${currentModel}" failed:`, err);

      if (isTransientOrCapacityError(err) && i < modelsToTry.length - 1) {
        console.warn(
          `[GeminiService] Transient / capacity error on ${currentModel}. Falling back to ${modelsToTry[i + 1]}...`,
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
      console.warn(
        `[GeminiService Stream] Model "${currentModel}" failed:`,
        err,
      );

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
