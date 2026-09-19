import type { AskApiResponse, ApiHealthResponse, ChatHistoryPayload } from "../types/chat.ts";

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (data: { totalText: string; tokens: number; durationMs: number; model?: string }) => void;
  onError: (error: string) => void;
}

export async function streamAssistantResponse(
  prompt: string,
  history: ChatHistoryPayload[] = [],
  callbacks: StreamCallbacks,
  signal?: AbortSignal
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

export async function askAssistant(
  prompt: string,
  history: ChatHistoryPayload[] = [],
  model?: string
): Promise<AskApiResponse> {
  try {
    const response = await fetch("/api/chat/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        history,
        model,
      }),
    });

    const data: AskApiResponse = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server returned error (${response.status})`,
      };
    }

    return data;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to connect to the assistant server. Please verify your connection.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function checkServerHealth(): Promise<ApiHealthResponse | null> {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
