import { useState, useEffect, useCallback, useRef } from "react";
import { ChatHeader } from "./ChatHeader.tsx";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput.tsx";
import { ChatFooter } from "./ChatFooter.tsx";
import { Toast } from "./Toast.tsx";
import { streamAssistantResponse } from "../services/chatService.ts";
import type { ChatMessage, ChatHistoryPayload } from "../types/chat.ts";

const STORAGE_KEY = "devai_chat_messages_v3";

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [prefilledPrompt, setPrefilledPrompt] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const mainScrollRef = useRef<HTMLElement | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isScrolledUpRef = useRef(false);

  useEffect(() => {
    isScrolledUpRef.current = isScrolledUp;
  }, [isScrolledUp]);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Monitor scroll position of the main transcript container
  const handleScroll = useCallback(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const threshold = 120; // 120px above the bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceFromBottom > threshold);
  }, []);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  const handleScrollBottom = useCallback(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        top: mainScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsScrolledUp(false);
    }
  }, []);

  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const userMessage: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: promptText,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      status: "streaming",
    };

    // Prepare conversation history from past successful messages
    const historyPayload: ChatHistoryPayload[] = messages
      .filter((m) => m.status === "sent" && m.content.trim())
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Optimistically add user message and streaming placeholder
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);
    setPrefilledPrompt("");

    // Auto-scroll down when initiating prompt
    setTimeout(handleScrollBottom, 50);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await streamAssistantResponse(
        promptText,
        historyPayload,
        {
          onChunk: (chunkText) => {
            if (abortController.signal.aborted) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + chunkText }
                  : m,
              ),
            );
            if (!isScrolledUpRef.current) {
              setTimeout(handleScrollBottom, 20);
            }
          },
          onDone: ({ totalText, tokens, durationMs, model }) => {
            if (abortController.signal.aborted) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: totalText || m.content,
                      status: "sent",
                      tokens,
                      durationMs,
                      model,
                    }
                  : m,
              ),
            );
            setIsLoading(false);
            if (!isScrolledUpRef.current) {
              setTimeout(handleScrollBottom, 60);
            }
          },
          onError: (errMsg) => {
            if (abortController.signal.aborted) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: m.content || errMsg,
                      status: m.content ? "sent" : "error",
                      error: errMsg,
                    }
                  : m,
              ),
            );
            setIsLoading(false);
          },
        },
        abortController.signal,
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        return;
      }
      const errMsg =
        err instanceof Error ? err.message : "Unexpected connection failure.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                content: m.content || errMsg,
                status: m.content ? "sent" : "error",
                error: errMsg,
              }
            : m,
        ),
      );
      setIsLoading(false);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleRetry = (failedMessage: ChatMessage) => {
    const errorIndex = messages.findIndex((m) => m.id === failedMessage.id);
    if (errorIndex > 0) {
      const previousUserMsg = messages[errorIndex - 1];
      if (previousUserMsg && previousUserMsg.role === "user") {
        setMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));
        handleSendMessage(previousUserMsg.content);
      }
    }
  };

  const handleNewSession = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast("New session initialized");
  };

  const handleSelectPrompt = (prompt: string) => {
    setPrefilledPrompt(prompt);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) => {
        if (m.status === "streaming") {
          return {
            ...m,
            content: m.content.trim()
              ? m.content
              : "Generation stopped by user.",
            status: "sent" as const,
          };
        }
        return m;
      }),
    );
    setIsLoading(false);
    showToast("Generation stopped");
  };

  // Only show the scroll to bottom button when generation is currently in progress AND user is scrolled up
  const showScrollBottom = isLoading && isScrolledUp;

  return (
    <div
      id="devai-app"
      className="bg-[#ffffff] font-sans text-zinc-950 antialiased h-screen flex flex-col overflow-hidden selection:bg-zinc-200"
    >
      {/* 1. Header: DevAI and New Session button (no model name, no green status) */}
      <ChatHeader onNewSession={handleNewSession} />

      {/* 2. Scrollable transcript area */}
      <main
        ref={mainScrollRef}
        id="main-scroll-container"
        className="flex-1 overflow-y-auto overflow-x-hidden pt-14 pb-28 sm:pb-32 w-full"
      >
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onSelectPrompt={handleSelectPrompt}
          onRetry={handleRetry}
          onToast={showToast}
          onStop={handleStop}
        />
      </main>

      {/* 3. Composer dock: voice input, character count, stop/generate, and conditional scroll bottom */}
      <ChatInput
        onSend={handleSendMessage}
        onStop={handleStop}
        onScrollBottom={handleScrollBottom}
        showScrollBottom={showScrollBottom}
        isLoading={isLoading}
        initialValue={prefilledPrompt}
        onToast={showToast}
      />

      {/* 4. Minimal footer (no green status dot, no active SSE label) */}
      <ChatFooter />

      {/* 5. Toast notification helper */}
      <Toast message={toastMessage} />
    </div>
  );
}
