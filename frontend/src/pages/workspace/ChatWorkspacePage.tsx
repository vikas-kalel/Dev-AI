import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import {
  useConversationList,
  useActiveConversation,
  useCreateConversation,
  useSendMessage,
  useUploadAttachment,
  useArchiveConversation,
} from "../../hooks/useConversations.js";
import { MessageList } from "../../components/MessageList.js";
import { ChatInput } from "../../components/ChatInput.js";
import { ChatSidebar } from "../../components/ChatSidebar.js";
import { ChatHeader } from "../../components/ChatHeader.js";
import { ChatFooter } from "../../components/ChatFooter.js";
import { useUIStore } from "../../stores/useUIStore.js";
import type { ChatMessage, ChatSession } from "../../types/chat.js";

export function ChatWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);

  const { data: conversations = [], isLoading: isListLoading } =
    useConversationList(projectId || null);
  const { mutate: createConv } = useCreateConversation();
  const { mutate: sendMessageMutate, isPending: isSending } = useSendMessage();
  const { mutate: uploadAttachmentMutate, isPending: isUploading } =
    useUploadAttachment();
  const { mutate: archiveConv } = useArchiveConversation();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Set active conversation when list loads
  useEffect(() => {
    if (conversations.length > 0 && !activeSessionId) {
      setActiveSessionId(conversations[0].id);
    }
  }, [conversations, activeSessionId]);

  const { data: activeConvData, isLoading: isConvLoading } =
    useActiveConversation(activeSessionId);

  const messages: ChatMessage[] = activeConvData?.messages || [];
  const attachments = activeConvData?.attachments || [];

  const handleNewSession = () => {
    if (!projectId) return;
    createConv(
      { projectId, title: "New Conversation" },
      {
        onSuccess: (newSession) => {
          setActiveSessionId(newSession.id);
        },
      },
    );
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // If no active session, create one first
    if (!activeSessionId && projectId) {
      createConv(
        { projectId, title: text.trim().slice(0, 36) },
        {
          onSuccess: (newSession) => {
            setActiveSessionId(newSession.id);
            sendMessageMutate({
              conversationId: newSession.id,
              content: text.trim(),
            });
          },
        },
      );
      return;
    }

    if (activeSessionId) {
      sendMessageMutate({
        conversationId: activeSessionId,
        content: text.trim(),
      });
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
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden h-full">
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
          isStreaming={isSending}
        />

        {/* Attachment chips bar if files are attached to conversation */}
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
        <div className="flex-1 overflow-y-auto">
          <MessageList
            messages={messages}
            isLoading={isSending || isConvLoading}
            onSelectPrompt={(p) => handleSendMessage(p)}
          />
        </div>

        {/* Chat Input & File Attachment */}
        <ChatInput
          onSend={handleSendMessage}
          onFileUpload={handleFileUpload}
          isLoading={isSending || isUploading}
          showScrollBottom={false}
        />

        {/* Minimal status footer */}
        <ChatFooter />
      </div>
    </div>
  );
}
