import React from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import { useProjectMembers } from "../../hooks/useMembers.js";
import { useUIStore } from "../../stores/useUIStore.js";
import { memberService } from "../../services/memberService.js";

export function MembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const { data: membersData, isLoading } = useProjectMembers(projectId || null);
  const { openDialog, showToast } = useUIStore();

  const members = membersData?.members || [];
  const projectName = projectData?.project?.name;

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
    </div>
  );
}
