import { AIProvider, AIRequest, AIResponse } from "./aiProvider.js";

export class MockAIProvider implements AIProvider {
  async generateResponse(input: AIRequest): Promise<AIResponse> {
    const projectName = input.projectName || "Project";
    const userPrompt = input.prompt.trim();

    // Create a helpful, realistic response grounded in the project context
    let responseText = "";

    if (input.attachmentSummaries && input.attachmentSummaries.length > 0) {
      const files = input.attachmentSummaries.map((f) => `\`${f.fileName}\``).join(", ");
      responseText = `I have analyzed the attached temporary conversation context (${files}) for **${projectName}**.\n\n` +
        `Regarding your inquiry: "${userPrompt}":\n\n` +
        `Here is the architectural assessment:\n` +
        `1. **Component Boundaries**: Clean modular separation adheres to standard project standards.\n` +
        `2. **State & Invariants**: Ensure all mutative endpoints validate authorization and scope invariants.\n` +
        `3. **Recommendation**: Implement corresponding test cases to verify error and edge cases.\n\n` +
        `Let me know if you'd like me to draft the implementation code or write additional unit tests!`;
    } else {
      responseText = `Hello! I am your **DevAI** engineering assistant for **${projectName}**.\n\n` +
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
}
