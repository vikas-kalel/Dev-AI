export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "sending" | "streaming" | "sent" | "error";

export interface ChatAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  processingStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status: MessageStatus;
  model?: string;
  error?: string;
  tokens?: number;
  durationMs?: number;
}

export interface ChatHistoryPayload {
  role: MessageRole;
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  attachments?: ChatAttachment[];
}

export interface AskApiResponse {
  success: boolean;
  answer?: string;
  model?: string;
  timestamp?: string;
  error?: string;
  tokens?: number;
  durationMs?: number;
}

export interface ApiHealthResponse {
  status: string;
  service: string;
  geminiConfigured: boolean;
  uptime: number;
  timestamp: string;
  model?: string;
}
