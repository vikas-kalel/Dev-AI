import { useState, useEffect, useCallback, useRef } from "react";
import { ChatHeader } from "./ChatHeader.tsx";
import { ChatSidebar } from "./ChatSidebar.tsx";
import { MessageList } from "./MessageList.tsx";
import { ChatInput } from "./ChatInput.tsx";
import { ChatFooter } from "./ChatFooter.tsx";
import { Toast } from "./Toast.tsx";
import { streamAssistantResponse } from "../services/chatService.ts";
import type {
  ChatMessage,
  ChatHistoryPayload,
  ChatSession,
} from "../types/chat.ts";

const SESSIONS_STORAGE_KEY = "devai_chat_sessions_v1";
const CURRENT_SESSION_ID_KEY = "devai_current_session_id";
const LEGACY_STORAGE_KEY = "devai_chat_messages_v3";

function loadInitialSessions(): {
  initialSessions: ChatSession[];
  initialActiveId: string;
} {
  try {
    const rawSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (rawSessions) {
      const parsed: ChatSession[] = JSON.parse(rawSessions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedActiveId = localStorage.getItem(CURRENT_SESSION_ID_KEY);
        const activeExists = parsed.some((s) => s.id === savedActiveId);
        const activeId =
          activeExists && savedActiveId ? savedActiveId : parsed[0].id;
        return { initialSessions: parsed, initialActiveId: activeId };
      }
    }

    // Check legacy messages storage to migrate seamlessly
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const parsedLegacy: ChatMessage[] = JSON.parse(legacyRaw);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const firstUser = parsedLegacy.find((m) => m.role === "user");
        const title =
          firstUser?.content.trim().slice(0, 36) || "Previous Conversation";
        const migratedSession: ChatSession = {
          id: `session-${Date.now()}`,
          title,
          createdAt: parsedLegacy[0]?.timestamp || new Date().toISOString(),
          updatedAt:
            parsedLegacy[parsedLegacy.length - 1]?.timestamp ||
            new Date().toISOString(),
          messages: parsedLegacy,
        };
        return {
          initialSessions: [migratedSession],
          initialActiveId: migratedSession.id,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load sessions from localStorage", err);
  }

  // Default fallback session
  const defaultSession: ChatSession = {
    id: `session-${Date.now()}`,
    title: "New Conversation",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  return {
    initialSessions: [defaultSession],
    initialActiveId: defaultSession.id,
  };
}

export function ChatWindow() {
  const [{ initialSessions, initialActiveId }] = useState(loadInitialSessions);
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] =
    useState<string>(initialActiveId);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Active messages initialized from the active session
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const current = initialSessions.find((s) => s.id === initialActiveId);
    return current ? current.messages : [];
  });

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

  // Sync active messages back to the active session object
  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          let title = s.title;
          if (title === "New Conversation" || title === "New Chat") {
            const firstUser = messages.find((m) => m.role === "user");
            if (firstUser && firstUser.content.trim()) {
              title = firstUser.content.trim().slice(0, 38);
            }
          }
          return {
            ...s,
            title,
            updatedAt: new Date().toISOString(),
            messages,
          };
        }
        return s;
      }),
    );
  }, [messages, activeSessionId]);

  // Persist sessions and active session ID to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(CURRENT_SESSION_ID_KEY, activeSessionId);
    } catch {
      // Ignore quota errors
    }
  }, [sessions, activeSessionId]);

  const handleScrollBottom = useCallback(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        top: mainScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsScrolledUp(false);
    }
  }, []);

  const handleSelectSession = useCallback(
    (id: string) => {
      if (id === activeSessionId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
      }

      const target = sessions.find((s) => s.id === id);
      if (target) {
        setActiveSessionId(id);
        setMessages(target.messages);
        setIsScrolledUp(false);
      }
    },
    [activeSessionId, sessions],
  );

  const handleNewSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }

    // If current session is already empty, just stay on it
    const active = sessions.find((s) => s.id === activeSessionId);
    if (active && active.messages.length === 0) {
      setMessages([]);
      showToast("Already in a new session");
      return;
    }

    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMessages([]);
    setIsScrolledUp(false);
    showToast("New chat initialized");
  }, [activeSessionId, sessions, showToast]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      if (id === activeSessionId && abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
      }

      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== id);
        if (remaining.length === 0) {
          const freshSession: ChatSession = {
            id: `session-${Date.now()}`,
            title: "New Conversation",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
          };
          setActiveSessionId(freshSession.id);
          setMessages([]);
          return [freshSession];
        }

        if (id === activeSessionId) {
          const nextSession = remaining[0];
          setActiveSessionId(nextSession.id);
          setMessages(nextSession.messages);
        }

        return remaining;
      });

      showToast("Conversation deleted");
    },
    [activeSessionId, showToast],
  );

  const handleRenameSession = useCallback(
    (id: string, newTitle: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, title: newTitle, updatedAt: new Date().toISOString() }
            : s,
        ),
      );
      showToast("Conversation renamed");
    },
    [showToast],
  );

  // Global Keyboard shortcut ⌘K / Ctrl+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewSession();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewSession]);

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

  const currentActiveSession = sessions.find((s) => s.id === activeSessionId);
  const currentTitle = currentActiveSession?.title || "New Conversation";
  const showScrollBottom = isLoading && isScrolledUp;

  return (
    <div
      id="devai-app"
      className="flex h-screen w-full overflow-hidden bg-white font-sans text-zinc-950 antialiased selection:bg-zinc-200"
    >
      {/* 1. Sidebar: Desktop persistent aside + Mobile off-canvas drawer */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Chat Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden bg-white">
        {/* Fixed/Sticky Top Header */}
        <ChatHeader
          currentTitle={currentTitle}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onNewSession={handleNewSession}
          isStreaming={isLoading}
        />

        {/* Scrollable transcript area */}
        <main
          ref={mainScrollRef}
          id="main-scroll-container"
          className="flex-1 overflow-y-auto overflow-x-hidden pb-48 sm:pb-44 w-full"
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

        {/* Floating Composer dock */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStop}
          onScrollBottom={handleScrollBottom}
          showScrollBottom={showScrollBottom}
          isLoading={isLoading}
          initialValue={prefilledPrompt}
          onToast={showToast}
        />

        {/* Clean minimal footer */}
        <ChatFooter />
      </div>

      {/* Global Toast Notification */}
      <Toast message={toastMessage} />
    </div>
  );
}
