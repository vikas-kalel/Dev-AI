import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sourceService } from "../services/sourceService.js";
import { useUIStore } from "../stores/useUIStore.js";
import { KnowledgeSourceType } from "../types/source.js";

export function useProjectSources(projectId: string | null) {
  return useQuery({
    queryKey: ["sources", projectId],
    queryFn: () =>
      projectId
        ? sourceService.listSources(projectId)
        : Promise.resolve({ success: true, sources: [] }),
    enabled: !!projectId,
  });
}

export function useCreateSource() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      projectId,
      type,
      name,
      config,
    }: {
      projectId: string;
      type: KnowledgeSourceType;
      name: string;
      config: Record<string, any>;
    }) => sourceService.createSource(projectId, type, name, config),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["sources", variables.projectId] });
      showToast("Knowledge source connected successfully!", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to connect source.", "error");
    },
  });
}

export function useDisconnectSource() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      projectId,
      sourceId,
    }: {
      projectId: string;
      sourceId: string;
    }) => sourceService.disconnectSource(projectId, sourceId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["sources", variables.projectId] });
      showToast("Source disconnected.", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to disconnect source.", "error");
    },
  });
}
