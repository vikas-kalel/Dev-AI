import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatService } from "../services/chatService.js";
import { useUIStore } from "../stores/useUIStore.js";

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
    onSuccess: (newSession, variables) => {
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["conversation", variables.conversationId],
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to send message.", "error");
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
