import { getGeminiClient, DEFAULT_MODEL, FALLBACK_MODELS } from "../config/gemini.js";

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GenerateChatOptions {
  prompt: string;
  history?: ChatHistoryItem[];
  model?: string;
  systemInstruction?: string;
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are a helpful, knowledgeable, and efficient AI assistant.
Provide clear, accurate, and concise answers formatted in markdown.
Format code cleanly with appropriate syntax highlighting language identifiers when applicable.
If you do not know the answer, be honest and admit it rather than hallucinating.`;

export async function generateChatResponse(
  options: GenerateChatOptions
): Promise<{ text: string; tokens: number; durationMs: number; model: string; timestamp: string }> {
  const { prompt, history = [], model: requestedModel, systemInstruction = DEFAULT_SYSTEM_INSTRUCTION } = options;

  const initialModel = requestedModel || DEFAULT_MODEL;
  const modelsToTry = [initialModel, ...FALLBACK_MODELS.filter((m) => m !== initialModel)];

  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    const startTime = Date.now();
    try {
      const ai = getGeminiClient();

      const contents = [
        ...history.map((h) => ({
          role: h.role,
          parts: h.parts.map((p) => ({ text: p.text })),
        })),
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ];

      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const responseText = response.text || "";
      const durationMs = Date.now() - startTime;
      const tokens =
        response.usageMetadata?.totalTokenCount ||
        (response.usageMetadata?.promptTokenCount || 0) +
          (response.usageMetadata?.candidatesTokenCount || 0);

      return {
        text: responseText,
        tokens,
        durationMs,
        model: currentModel,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      lastError = err;
      const isLastAttempt = i === modelsToTry.length - 1;
      if (isLastAttempt) {
        throw err;
      }
      console.warn(`[Gemini Fallback] Model ${currentModel} failed; attempting next fallback ${modelsToTry[i + 1]}...`);
    }
  }

  throw lastError || new Error("Failed to generate response after all model fallback attempts.");
}

export async function generateChatStream(
  options: GenerateChatOptions,
  onChunk: (text: string) => void,
  isAborted?: () => boolean
): Promise<{ totalText: string; tokens: number; durationMs: number; model: string }> {
  const { prompt, history = [], model: requestedModel, systemInstruction = DEFAULT_SYSTEM_INSTRUCTION } = options;

  const initialModel = requestedModel || DEFAULT_MODEL;
  const modelsToTry = [initialModel, ...FALLBACK_MODELS.filter((m) => m !== initialModel)];

  let lastError: unknown = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    if (isAborted?.()) {
      return { totalText: "", tokens: 0, durationMs: 0, model: initialModel };
    }

    const currentModel = modelsToTry[i];
    const startTime = Date.now();
    try {
      const ai = getGeminiClient();

      const contents = [
        ...history.map((h) => ({
          role: h.role,
          parts: h.parts.map((p) => ({ text: p.text })),
        })),
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ];

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
          const tt = chunk.usageMetadata.totalTokenCount;
          const pt = chunk.usageMetadata.promptTokenCount || 0;
          const ct = chunk.usageMetadata.candidatesTokenCount || 0;
          if (tt || pt || ct) {
            totalTokens = tt || pt + ct;
          }
        }

        if (isAborted?.()) {
          break;
        }
      }

      const durationMs = Date.now() - startTime;
      return {
        totalText: fullText,
        tokens: totalTokens,
        durationMs,
        model: currentModel,
      };
    } catch (err) {
      lastError = err;
      const isLastAttempt = i === modelsToTry.length - 1;
      if (isLastAttempt) {
        throw err;
      }
      console.warn(`[Gemini Fallback Stream] Model ${currentModel} failed; attempting next fallback ${modelsToTry[i + 1]}...`);
    }
  }

  throw lastError || new Error("Failed to stream response after all model fallback attempts.");
}
