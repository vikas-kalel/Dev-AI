import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import { useProjectMembers } from "../../hooks/useMembers.js";
import { useUIStore } from "../../stores/useUIStore.js";
import { memberService } from "../../services/memberService.js";
import { useQueryClient } from "@tanstack/react-query";

export function MembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const { data: membersData, isLoading } = useProjectMembers(projectId || null);
  const { openDialog, showToast } = useUIStore();
  const qc = useQueryClient();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const members = membersData?.members || [];
  const invitations = membersData?.invitations || [];
  const projectName = projectData?.project?.name;

  const handleResend = async (invitationId: string) => {
    try {
      const res = await memberService.resendInvitation(invitationId);
      if (res.token) {
        const link = `${window.location.origin}/invite/${res.token}`;
        await navigator.clipboard.writeText(link);
        setCopiedId(invitationId);
        setTimeout(() => setCopiedId(null), 2500);
        showToast("Invitation resent and link copied to clipboard!", "success");
      } else {
        showToast("Invitation resent to recipient email.", "success");
      }
      qc.invalidateQueries({ queryKey: ["members", projectId] });
    } catch (err: any) {
      showToast(err.message || "Failed to resend invitation.", "error");
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await memberService.revokeInvitation(invitationId);
      showToast("Invitation revoked.", "info");
      qc.invalidateQueries({ queryKey: ["members", projectId] });
    } catch (err: any) {
      showToast(err.message || "Failed to revoke invitation.", "error");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-6xl mx-auto w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Project Members
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase">
              Maintainer Authority
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Manage developer access and maintainers for {projectName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openDialog("INVITE_MEMBER", { projectId })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            person_add
          </span>
          <span>Invite Member</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    No members found in this project.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr
                    key={member._id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-zinc-950">
                      {member.name || "Member"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-600">
                      {member.email}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                          member.role === "MAINTAINER"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[10px] text-zinc-500">
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openDialog("CHANGE_ROLE", {
                              projectId,
                              userId: member.userId,
                              currentRole: member.role,
                              memberName: member.name,
                              projectName,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Change Role
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openDialog("REMOVE_MEMBER", {
                              projectId,
                              userId: member.userId,
                              memberName: member.name,
                              projectName,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                <span>Pending Invitations</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold">
                  {invitations.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Colleagues invited to this project who have not yet joined
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Invited Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Invited By</th>
                    <th className="py-3 px-3">Expires</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {invitations.map((inv: any) => (
                    <tr
                      key={inv._id}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-zinc-950">
                        {inv.email}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                            inv.invitedRole === "MAINTAINER"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {inv.invitedRole}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-600">
                        {inv.invitedBy?.name || inv.invitedBy?.email || "Admin"}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-500 text-[11px]">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResend(inv._id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              send
                            </span>
                            <span>
                              {copiedId === inv._id ? "Copied Link!" : "Resend"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv._id)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
