export interface AIRequest {
  prompt: string;
  projectName?: string;
  projectDescription?: string;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  attachmentSummaries?: Array<{
    fileName: string;
    mimeType: string;
  }>;
}

export interface AIResponse {
  content: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
}
