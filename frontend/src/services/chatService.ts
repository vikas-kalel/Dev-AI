import { request } from "./api.js";
import type {
  ApiHealthResponse,
  ChatHistoryPayload,
  ChatMessage,
  ChatSession,
  ChatAttachment,
} from "../types/chat.js";

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (data: {
    totalText: string;
    tokens: number;
    durationMs: number;
    model?: string;
  }) => void;
  onError: (error: string) => void;
}

export async function streamAssistantResponse(
  prompt: string,
  history: ChatHistoryPayload[] = [],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        history,
      }),
      signal,
    });

    if (!response.ok) {
      let errText = `Server error (${response.status})`;
      try {
        const json = await response.json();
        if (json.error) errText = json.error;
      } catch {
        // ignore
      }
      callbacks.onError(errText);
      return;
    }

    if (!response.body) {
      callbacks.onError("No streaming response body received.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const onAbort = () => {
      try {
        reader.cancel();
      } catch {
        // ignore
      }
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      while (true) {
        if (signal?.aborted) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          break;
        }

        const { done, value } = await reader.read();
        if (done || signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep unfinished trailing line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (signal?.aborted) break;
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payloadStr = trimmed.slice(6).trim();
          if (!payloadStr) continue;

          try {
            const data = JSON.parse(payloadStr);
            if (signal?.aborted) break;

            if (data.type === "chunk" && typeof data.text === "string") {
              callbacks.onChunk(data.text);
            } else if (data.type === "done") {
              callbacks.onDone({
                totalText: data.totalText || "",
                tokens: data.tokens || 0,
                durationMs: data.durationMs || 0,
                model: data.model,
              });
            } else if (data.type === "error") {
              callbacks.onError(data.error || "Streaming error occurred.");
            }
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    } finally {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      return; // Handled cleanly by user abort
    }
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to connect to the inference server.";
    callbacks.onError(errorMsg);
  }
}

export const chatService = {
  async listConversations(projectId: string): Promise<ChatSession[]> {
    const res = await request<{ success: boolean; conversations: any[] }>(
      `/projects/${projectId}/conversations`,
      { method: "GET" },
    );
    return (res.conversations || []).map((c) => ({
      id: c._id,
      title: c.title,
      projectId: c.projectId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messages: [],
    }));
  },

  async createConversation(
    projectId: string,
    title?: string,
  ): Promise<ChatSession> {
    const res = await request<{ success: boolean; conversation: any }>(
      `/projects/${projectId}/conversations`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
    );
    const c = res.conversation;
    return {
      id: c._id,
      title: c.title,
      projectId: c.projectId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messages: [],
    };
  },

  async getConversation(conversationId: string): Promise<ChatSession> {
    const res = await request<{ success: boolean; conversation: any }>(
      `/conversations/${conversationId}`,
      { method: "GET" },
    );
    const c = res.conversation;
    const messages: ChatMessage[] = (c.messages || []).map((m: any) => ({
      id: m._id,
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
      timestamp: m.createdAt,
      status: "sent",
      model: m.model,
      tokens: (m.inputTokens || 0) + (m.outputTokens || 0),
    }));

    const attachments: ChatAttachment[] = (c.attachments || []).map(
      (a: any) => ({
        id: a._id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        processingStatus: a.processingStatus,
        createdAt: a.createdAt,
      }),
    );

    return {
      id: c._id,
      title: c.title,
      projectId: c.projectId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messages,
      attachments,
    };
  },

  async sendMessage(
    conversationId: string,
    content: string,
  ): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const res = await request<{
      success: boolean;
      userMessage: any;
      assistantMessage: any;
    }>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    const u = res.userMessage;
    const a = res.assistantMessage;

    return {
      userMessage: {
        id: u._id,
        role: "user",
        content: u.content,
        timestamp: u.createdAt,
        status: "sent",
      },
      assistantMessage: {
        id: a._id,
        role: "assistant",
        content: a.content,
        timestamp: a.createdAt,
        status: "sent",
        model: a.model,
        tokens: (a.inputTokens || 0) + (a.outputTokens || 0),
      },
    };
  },

  async archiveConversation(conversationId: string): Promise<void> {
    await request(`/conversations/${conversationId}/archive`, {
      method: "POST",
    });
  },

  async uploadAttachment(
    conversationId: string,
    file: File,
  ): Promise<ChatAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await request<{ success: boolean; attachment: any }>(
      `/conversations/${conversationId}/attachments`,
      {
        method: "POST",
        body: formData,
      },
    );

    return res.attachment;
  },

  async removeAttachment(
    conversationId: string,
    attachmentId: string,
  ): Promise<void> {
    await request(
      `/conversations/${conversationId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
      },
    );
  },
};

export async function checkServerHealth(): Promise<ApiHealthResponse | null> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ── Conversation SSE streaming ───────────────────────────────────────────────

export interface ConversationStreamCallbacks {
  onStart?: (userMessageId: string, assistantMessageId: string) => void;
  onChunk: (text: string) => void;
  onDone: (data: { conversationId: string }) => void;
  onError: (error: string, partial: boolean, partialText?: string) => void;
}

export async function streamConversationMessage(
  conversationId: string,
  content: string,
  callbacks: ConversationStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch(
      `/api/v1/conversations/${conversationId}/messages/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
        signal,
      },
    );

    if (!response.ok) {
      let errText = `Server error (${response.status})`;
      try {
        const json = await response.json();
        if (json.error?.message) errText = json.error.message;
        else if (json.error) errText = String(json.error);
      } catch {
        /* ignore */
      }
      callbacks.onError(errText, false);
      return;
    }

    if (!response.body) {
      callbacks.onError("No streaming response body received.", false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const onAbort = (): void => {
      try {
        reader.cancel();
      } catch {
        /* ignore */
      }
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      while (true) {
        if (signal?.aborted) {
          await reader.cancel().catch(() => {
            /* ignore */
          });
          break;
        }

        const { done, value } = await reader.read();
        if (done || signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (signal?.aborted) break;
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payloadStr = trimmed.slice(6).trim();
          if (!payloadStr) continue;

          try {
            const data = JSON.parse(payloadStr) as Record<string, unknown>;

            if (data["type"] === "start") {
              callbacks.onStart?.(
                data["userMessageId"] as string,
                data["assistantMessageId"] as string,
              );
            } else if (
              data["type"] === "chunk" &&
              typeof data["text"] === "string"
            ) {
              callbacks.onChunk(data["text"]);
            } else if (data["type"] === "done") {
              callbacks.onDone({
                conversationId: data["conversationId"] as string,
              });
            } else if (data["type"] === "error") {
              callbacks.onError(
                (data["error"] as string) || "Streaming error occurred.",
                !!data["partial"],
                data["partialText"] as string | undefined,
              );
            }
          } catch {
            /* ignore malformed SSE line */
          }
        }
      }
    } finally {
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  } catch (err: unknown) {
    if (signal?.aborted) return;
    const msg =
      err instanceof Error ? err.message : "Failed to connect to server.";
    callbacks.onError(msg, false);
  }
}
