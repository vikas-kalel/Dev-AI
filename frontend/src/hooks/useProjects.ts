import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "../services/projectService.js";
import { useUIStore } from "../stores/useUIStore.js";

export function useProjectList(organizationId: string | null) {
  return useQuery({
    queryKey: ["projects", organizationId],
    queryFn: () =>
      organizationId
        ? projectService.listProjects(organizationId)
        : Promise.resolve({ success: true, projects: [] }),
    enabled: !!organizationId,
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      projectId
        ? projectService.getProject(projectId)
        : Promise.reject("No projectId"),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      organizationId,
      name,
      slug,
      description,
    }: {
      organizationId: string;
      name: string;
      slug: string;
      description?: string;
    }) => projectService.createProject(organizationId, name, slug, description),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["projects", variables.organizationId],
      });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showToast("Project created successfully!", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create project.", "error");
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: (projectId: string) => projectService.archiveProject(projectId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", data.project._id] });
      showToast("Project archived.", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to archive project.", "error");
    },
  });
}
