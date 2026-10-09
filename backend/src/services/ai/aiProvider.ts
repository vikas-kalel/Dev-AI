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

export interface AIStreamResult {
  totalText: string;
  model: string;
  tokens: number;
  durationMs: number;
}

export interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
  streamResponse(
    input: AIRequest,
    onChunk: (text: string) => void,
    isAborted?: () => boolean,
  ): Promise<AIStreamResult>;
}
