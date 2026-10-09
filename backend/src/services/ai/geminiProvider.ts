import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamResult,
} from "./aiProvider.js";
import { generateChatResponse, generateChatStream } from "../geminiService.js";
import { MockAIProvider } from "./mockProvider.js";
import { logger } from "../../config/logger.js";

export class GeminiProvider implements AIProvider {
  private fallbackMock = new MockAIProvider();

  /** Builds the enriched prompt string from project/attachment context. */
  private buildPrompt(input: AIRequest): string {
    let prompt = input.prompt;
    if (input.projectName) {
      prompt = `[Project Context: ${input.projectName} - ${input.projectDescription || ""}]\n\n${prompt}`;
    }
    if (input.attachmentSummaries && input.attachmentSummaries.length > 0) {
      const files = input.attachmentSummaries.map((f) => f.fileName).join(", ");
      prompt = `[Attached Context Files: ${files}]\n${prompt}`;
    }
    return prompt;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    try {
      const history = (input.history || []).map((h) => ({
        role: h.role,
        content: h.content,
      }));

      const result = await generateChatResponse({
        prompt: this.buildPrompt(input),
        history,
      });

      return {
        content: result.text,
        model: result.model,
        outputTokens: result.tokens,
      };
    } catch (err) {
      logger.warn(
        "[GeminiProvider] Gemini API failed, falling back to mock provider",
        { error: err instanceof Error ? err.message : String(err) },
      );
      return this.fallbackMock.generateResponse(input);
    }
  }

  async streamResponse(
    input: AIRequest,
    onChunk: (text: string) => void,
    isAborted?: () => boolean,
  ): Promise<AIStreamResult> {
    try {
      const history = (input.history || []).map((h) => ({
        role: h.role,
        content: h.content,
      }));

      return await generateChatStream(
        { prompt: this.buildPrompt(input), history },
        onChunk,
        isAborted,
      );
    } catch (err) {
      logger.warn(
        "[GeminiProvider] Stream failed, falling back to mock provider",
        { error: err instanceof Error ? err.message : String(err) },
      );
      return this.fallbackMock.streamResponse(input, onChunk, isAborted);
    }
  }
}
