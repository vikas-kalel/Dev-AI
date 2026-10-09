import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memberService } from "../services/memberService.js";
import { useUIStore } from "../stores/useUIStore.js";
import { ProjectRole } from "../types/member.js";

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["members", projectId],
    queryFn: () =>
      projectId
        ? memberService.listMembers(projectId)
        : Promise.resolve({ success: true, members: [] }),
    enabled: !!projectId,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      projectId,
      email,
      role,
    }: {
      projectId: string;
      email: string;
      role: ProjectRole;
    }) => memberService.addMember(projectId, email, role),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["members", variables.projectId] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      showToast(
        data.type === "INVITATION"
          ? "Invitation dispatched to user."
          : "Member added to project.",
        "success",
      );
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to add member.", "error");
    },
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: ProjectRole;
    }) => memberService.changeRole(projectId, userId, role),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ["members", variables.projectId] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast(data.message || "Role updated successfully.", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update role.", "error");
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => memberService.removeMember(projectId, userId),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["members", variables.projectId] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("Member removed from project.", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to remove member.", "error");
    },
  });
}
