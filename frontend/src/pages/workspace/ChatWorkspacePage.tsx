import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import {
  useConversationList,
  useActiveConversation,
  useCreateConversation,
  useUploadAttachment,
  useArchiveConversation,
} from "../../hooks/useConversations.js";
import {
  streamConversationMessage,
  type ConversationStreamCallbacks,
} from "../../services/chatService.js";
import { MessageList } from "../../components/MessageList.js";
import { ChatInput } from "../../components/ChatInput.js";
import { ChatSidebar } from "../../components/ChatSidebar.js";
import { ChatHeader } from "../../components/ChatHeader.js";
import { ChatFooter } from "../../components/ChatFooter.js";
import { useUIStore } from "../../stores/useUIStore.js";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatMessage, ChatSession } from "../../types/chat.js";

export function ChatWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  const { data: conversations = [] } = useConversationList(projectId || null);
  const { mutate: createConv } = useCreateConversation();
  const { mutate: uploadAttachmentMutate, isPending: isUploading } =
    useUploadAttachment();
  const { mutate: archiveConv } = useArchiveConversation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Single unified message state for the active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const isStreamingRef = useRef(false);
  const [isStreaming, setIsStreamingState] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isScrolledUpRef = useRef(false);

  const setIsStreaming = useCallback((streaming: boolean) => {
    isStreamingRef.current = streaming;
    setIsStreamingState(streaming);
  }, []);

  // Set active conversation when list loads
  useEffect(() => {
    if (conversations.length > 0 && !activeSessionId) {
      setActiveSessionId(conversations[0].id);
    }
  }, [conversations, activeSessionId]);

  const { data: activeConvData, isLoading: isConvLoading } =
    useActiveConversation(activeSessionId);

  // Sync messages from server query when active conversation loads or changes
  // Only sync when not currently streaming to prevent any race condition or stale overwrite
  useEffect(() => {
    if (!isStreamingRef.current) {
      setMessages(activeConvData?.messages || []);
    }
  }, [activeConvData?.messages, activeSessionId]);

  const attachments = activeConvData?.attachments || [];

  const handleNewSession = () => {
    if (!projectId) return;
    createConv(
      { projectId, title: "New Conversation" },
      {
        onSuccess: (newSession) => {
          setActiveSessionId(newSession.id);
          setMessages([]);
        },
      },
    );
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.status === "streaming"
          ? {
              ...m,
              content: m.content.trim() || "Generation stopped.",
              status: "sent" as const,
            }
          : m,
      ),
    );
    setIsStreaming(false);
  }, [setIsStreaming]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreamingRef.current) return;

    // ── Optimistic user message & streaming placeholder ──────────────────
    const optimisticUserId = `local-user-${Date.now()}`;
    const optimisticAssistantId = `local-assistant-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: optimisticUserId,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    const assistantMsg: ChatMessage = {
      id: optimisticAssistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      status: "streaming",
    };

    // Immediately display user prompt and assistant streaming bubble
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const scrollDown = () => {
      if (!isScrolledUpRef.current) {
        const el = document.getElementById("main-scroll-container");
        if (el) el.scrollTop = el.scrollHeight;
      }
    };
    setTimeout(scrollDown, 50);

    const doStream = async (convId: string) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let realUserId = optimisticUserId;
      let realAssistantId = optimisticAssistantId;
      let accumulatedText = "";

      try {
        await streamConversationMessage(
          convId,
          trimmed,
          {
            onStart: (uId: string, aId: string) => {
              realUserId = uId;
              realAssistantId = aId;
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id === optimisticUserId) return { ...m, id: uId };
                  if (m.id === optimisticAssistantId) return { ...m, id: aId };
                  return m;
                }),
              );
            },
            onChunk: (chunk: string) => {
              if (abortController.signal.aborted) return;
              accumulatedText += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === realAssistantId || m.id === optimisticAssistantId
                    ? { ...m, content: m.content + chunk }
                    : m,
                ),
              );
              setTimeout(scrollDown, 20);
            },
            onDone: (_data: { conversationId: string }) => {
              if (abortController.signal.aborted) return;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === realAssistantId || m.id === optimisticAssistantId
                    ? { ...m, status: "sent" as const }
                    : m,
                ),
              );
              setIsStreaming(false);

              // Update TanStack Query cache in-memory to prevent any redundant API calls or stale flicker
              qc.setQueryData<ChatSession>(["conversation", convId], (old) => {
                if (!old) return old;
                const existing = (old.messages || []).filter(
                  (m) =>
                    m.id !== optimisticUserId &&
                    m.id !== optimisticAssistantId &&
                    m.id !== realUserId &&
                    m.id !== realAssistantId,
                );
                return {
                  ...old,
                  messages: [
                    ...existing,
                    { ...userMsg, id: realUserId },
                    {
                      ...assistantMsg,
                      id: realAssistantId,
                      content: accumulatedText,
                      status: "sent",
                    },
                  ],
                };
              });

              // If this was the first message, update sidebar title in-memory
              if (projectId) {
                qc.setQueryData<ChatSession[]>(
                  ["conversations", projectId],
                  (old) => {
                    if (!old) return old;
                    return old.map((s) =>
                      s.id === convId &&
                      (s.title === "New Conversation" || s.title === "New Chat")
                        ? { ...s, title: trimmed.slice(0, 36) }
                        : s,
                    );
                  },
                );
              }

              setTimeout(scrollDown, 80);
            },
            onError: (
              errMsg: string,
              partial: boolean,
              partialText?: string,
            ) => {
              if (abortController.signal.aborted) return;
              const displayContent =
                partial && partialText
                  ? partialText + `\n\n*[Stream interrupted: ${errMsg}]*`
                  : errMsg;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === realAssistantId || m.id === optimisticAssistantId
                    ? {
                        ...m,
                        content: displayContent,
                        status: "error" as const,
                        error: errMsg,
                      }
                    : m,
                ),
              );
              setIsStreaming(false);
              showToast(errMsg, "error");
            },
          } satisfies ConversationStreamCallbacks,
          abortController.signal,
        );
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errMsg =
          err instanceof Error ? err.message : "Unexpected stream failure.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === realAssistantId || m.id === optimisticAssistantId
              ? {
                  ...m,
                  content: errMsg,
                  status: "error" as const,
                  error: errMsg,
                }
              : m,
          ),
        );
        setIsStreaming(false);
        showToast(errMsg, "error");
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    // ── If no active session yet, create one first ─────────────────────────
    if (!activeSessionId && projectId) {
      createConv(
        { projectId, title: trimmed.slice(0, 36) },
        {
          onSuccess: (newSession) => {
            setActiveSessionId(newSession.id);
            doStream(newSession.id);
          },
          onError: (err: any) => {
            showToast(
              err?.message || "Failed to create conversation.",
              "error",
            );
            setIsStreaming(false);
          },
        },
      );
      return;
    }

    if (activeSessionId) {
      doStream(activeSessionId);
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

  const handleFileUpload = (file: File) => {
    if (!activeSessionId && projectId) {
      createConv(
        { projectId, title: `Context: ${file.name}` },
        {
          onSuccess: (newSession) => {
            setActiveSessionId(newSession.id);
            uploadAttachmentMutate({ conversationId: newSession.id, file });
          },
        },
      );
      return;
    }
    if (activeSessionId) {
      uploadAttachmentMutate({ conversationId: activeSessionId, file });
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    archiveConv(sessionId, {
      onSuccess: () => {
        if (activeSessionId === sessionId) {
          const remaining = conversations.filter((c) => c.id !== sessionId);
          setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
          setMessages([]);
        }
      },
    });
  };

  const handleRenameSession = (_sessionId: string, _newTitle: string) => {
    // Session title renaming
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Conversation history sub-sidebar */}
      <ChatSidebar
        sessions={conversations}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          if (isStreamingRef.current) handleStop();
          setActiveSessionId(id);
        }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden h-full relative">
        <ChatHeader
          currentTitle={
            activeConvData?.title ||
            projectData?.project?.name ||
            "Project AI Chat"
          }
          onToggleMobileSidebar={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
          onNewSession={handleNewSession}
          isStreaming={isStreaming}
        />

        {/* Attachment chips bar */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center gap-2 overflow-x-auto select-none">
            <span className="text-[11px] font-mono text-zinc-500 shrink-0">
              Temporary Context:
            </span>
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs text-zinc-800 shadow-2xs shrink-0"
              >
                <span className="material-symbols-outlined text-[14px] text-zinc-400">
                  description
                </span>
                <span className="font-mono text-[11px] truncate max-w-[150px]">
                  {att.fileName}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
            ))}
          </div>
        )}

        {/* Message List */}
        <div
          id="main-scroll-container"
          className="flex-1 overflow-y-auto pb-44"
          onScroll={(e) => {
            const el = e.currentTarget;
            const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
            isScrolledUpRef.current = dist > 120;
          }}
        >
          <MessageList
            messages={messages}
            isLoading={isStreaming || isConvLoading}
            onSelectPrompt={(p) => handleSendMessage(p)}
            onRetry={handleRetry}
            onStop={handleStop}
          />
        </div>

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStop}
          onFileUpload={handleFileUpload}
          isLoading={isStreaming || isUploading}
          showScrollBottom={false}
        />

        <ChatFooter />
      </div>
    </div>
  );
}
