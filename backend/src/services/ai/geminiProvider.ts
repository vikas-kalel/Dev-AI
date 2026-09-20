import { AIProvider, AIRequest, AIResponse } from "./aiProvider.js";
import { generateChatResponse } from "../geminiService.js";
import { MockAIProvider } from "./mockProvider.js";

export class GeminiProvider implements AIProvider {
  private fallbackMock = new MockAIProvider();

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    try {
      const history = (input.history || []).map((h) => ({
        role: h.role,
        content: h.content,
      }));

      let prompt = input.prompt;
      if (input.projectName) {
        prompt = `[Project Context: ${input.projectName} - ${input.projectDescription || ""}]\n\n${prompt}`;
      }

      if (input.attachmentSummaries && input.attachmentSummaries.length > 0) {
        const files = input.attachmentSummaries.map((f) => f.fileName).join(", ");
        prompt = `[Attached Context Files: ${files}]\n${prompt}`;
      }

      const result = await generateChatResponse({
        prompt,
        history,
      });

      return {
        content: result.text,
        model: result.model,
        outputTokens: result.tokens,
      };
    } catch (err) {
      console.warn("[GeminiProvider] Failed to get response from Gemini API, falling back to mock:", err);
      return this.fallbackMock.generateResponse(input);
    }
  }
}
