export type MessageRole = "user" | "assistant";

export type MessageStatus = "sending" | "streaming" | "sent" | "error";

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
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
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
