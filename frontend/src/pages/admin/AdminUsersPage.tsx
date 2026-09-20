import React, { useState } from "react";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useAdminUsers } from "../../hooks/useAdminOverview.js";
import { useProjectList } from "../../hooks/useProjects.js";
import { useUIStore } from "../../stores/useUIStore.js";

export function AdminUsersPage() {
  const { data: meData } = useCurrentUser();
  const orgMembership = meData?.organizations?.[0];
  const orgId = orgMembership?.organizationId?._id || null;

  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const { data: projectsData } = useProjectList(orgId);
  const { data: usersData, isLoading } = useAdminUsers(orgId, {
    projectId: selectedProject || undefined,
    role: selectedRole || undefined,
    status: selectedStatus || undefined,
    search: search || undefined,
  });

  const { openDialog } = useUIStore();
  const users = usersData?.users || [];
  const projects = projectsData?.projects || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-7xl mx-auto w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
            Users & Role Management
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Organization-level membership governance & project role transitions
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-zinc-400 text-[16px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:bg-white transition-all font-sans"
          />
        </div>

        {/* Project Filter */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans cursor-pointer"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="MAINTAINER">Maintainer</option>
          <option value="DEVELOPER">Developer</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 font-sans cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REMOVED">Removed</option>
        </select>

        {(search || selectedProject || selectedRole || selectedStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedProject("");
              setSelectedRole("");
              setSelectedStatus("");
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((rec) => (
                  <tr
                    key={rec.membershipId}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-zinc-950">
                      {rec.user?.name || "User"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-600">
                      {rec.user?.email}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-zinc-900">
                      {rec.project?.name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                          rec.role === "MAINTAINER"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {rec.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono text-[10px] text-zinc-500">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openDialog("CHANGE_ROLE", {
                              projectId: rec.project?._id,
                              userId: rec.user?._id,
                              currentRole: rec.role,
                              memberName: rec.user?.name,
                              projectName: rec.project?.name,
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
                              projectId: rec.project?._id,
                              userId: rec.user?._id,
                              memberName: rec.user?.name,
                              projectName: rec.project?.name,
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
