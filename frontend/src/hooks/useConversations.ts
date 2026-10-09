import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "../services/chatService.js";
import { useUIStore } from "../stores/useUIStore.js";
import type { ChatMessage, ChatSession } from "../types/chat.js";

export function useConversationList(projectId: string | null) {
  return useQuery({
    queryKey: ["conversations", projectId],
    queryFn: () =>
      projectId
        ? chatService.listConversations(projectId)
        : Promise.resolve([]),
    enabled: !!projectId,
  });
}

export function useActiveConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () =>
      conversationId
        ? chatService.getConversation(conversationId)
        : Promise.reject("No id"),
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, title }: { projectId: string; title?: string }) =>
      chatService.createConversation(projectId, title),
    onSuccess: (_newSession, variables) => {
      qc.invalidateQueries({
        queryKey: ["conversations", variables.projectId],
      });
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => chatService.sendMessage(conversationId, content),
    onMutate: async ({ conversationId, content }) => {
      // 1. Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["conversation", conversationId] });

      // 2. Snapshot the previous conversation state
      const previousConv = qc.getQueryData<ChatSession>([
        "conversation",
        conversationId,
      ]);

      // 3. Create optimistic user message
      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      // 4. Optimistically update the cache immediately
      if (previousConv) {
        qc.setQueryData<ChatSession>(["conversation", conversationId], {
          ...previousConv,
          messages: [...(previousConv.messages || []), optimisticMessage],
        });
      }

      return { previousConv, conversationId };
    },
    onSuccess: (data, variables) => {
      qc.setQueryData<ChatSession>(
        ["conversation", variables.conversationId],
        (old) => {
          if (!old) return old;
          const withoutOptimistic = (old.messages || []).filter(
            (m) => !m.id.startsWith("optimistic-"),
          );
          return {
            ...old,
            messages: [
              ...withoutOptimistic,
              data.userMessage,
              data.assistantMessage,
            ],
          };
        },
      );
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousConv) {
        qc.setQueryData(
          ["conversation", context.conversationId],
          context.previousConv,
        );
      }
      showToast(err.message || "Failed to send message.", "error");
    },
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({
        queryKey: ["conversation", variables.conversationId],
      });
    },
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      conversationId,
      file,
    }: {
      conversationId: string;
      file: File;
    }) => chatService.uploadAttachment(conversationId, file),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["conversation", variables.conversationId],
      });
      showToast("File attached as conversation context.", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to upload attachment.", "error");
    },
  });
}

export function useArchiveConversation() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: (conversationId: string) =>
      chatService.archiveConversation(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      showToast("Conversation archived.", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to archive conversation.", "error");
    },
  });
}
