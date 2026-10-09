import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamResult,
} from "./aiProvider.js";

export class MockAIProvider implements AIProvider {
  async generateResponse(input: AIRequest): Promise<AIResponse> {
    const projectName = input.projectName || "Project";
    const userPrompt = input.prompt.trim();

    // Create a helpful, realistic response grounded in the project context
    let responseText = "";

    if (input.attachmentSummaries && input.attachmentSummaries.length > 0) {
      const files = input.attachmentSummaries
        .map((f) => `\`${f.fileName}\``)
        .join(", ");
      responseText =
        `I have analyzed the attached temporary conversation context (${files}) for **${projectName}**.\n\n` +
        `Regarding your inquiry: "${userPrompt}":\n\n` +
        `Here is the architectural assessment:\n` +
        `1. **Component Boundaries**: Clean modular separation adheres to standard project standards.\n` +
        `2. **State & Invariants**: Ensure all mutative endpoints validate authorization and scope invariants.\n` +
        `3. **Recommendation**: Implement corresponding test cases to verify error and edge cases.\n\n` +
        `Let me know if you'd like me to draft the implementation code or write additional unit tests!`;
    } else {
      responseText =
        `Hello! I am your **DevAI** engineering assistant for **${projectName}**.\n\n` +
        `In response to your query:\n> ${userPrompt}\n\n` +
        `Here is a recommended approach:\n` +
        `\`\`\`typescript\n` +
        `// Implementation snippet for ${projectName}\n` +
        `export async function handleOperation(payload: Record<string, unknown>) {\n` +
        `  // 1. Verify project-level invariants\n` +
        `  console.log("Executing in project context: ${projectName}");\n` +
        `  return { success: true, timestamp: new Date().toISOString() };\n` +
        `}\n` +
        `\`\`\`\n\n` +
        `Feel free to ask further technical questions, request refactorings, or upload file context for analysis.`;
    }

    return {
      content: responseText,
      model: "mock-devai-v1",
      inputTokens: Math.round(input.prompt.length / 4),
      outputTokens: Math.round(responseText.length / 4),
    };
  }

  async streamResponse(
    input: AIRequest,
    onChunk: (text: string) => void,
    isAborted?: () => boolean,
  ): Promise<AIStreamResult> {
    const startTime = Date.now();
    // Reuse generateResponse to get the full mock text
    const { content, model } = await this.generateResponse(input);

    // Simulate streaming: emit ~5-word chunks with a small delay
    const words = content.split(" ");
    const CHUNK_SIZE = 5;
    let fullText = "";

    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      if (isAborted?.()) break;
      const chunk =
        words.slice(i, i + CHUNK_SIZE).join(" ") +
        (i + CHUNK_SIZE < words.length ? " " : "");
      fullText += chunk;
      onChunk(chunk);
      // Small artificial delay so the client actually sees tokens arriving
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return {
      totalText: fullText,
      model,
      tokens: Math.round((input.prompt.length + fullText.length) / 4),
      durationMs: Date.now() - startTime,
    };
  }
}
