import React from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useAdminOverview } from "../../hooks/useAdminOverview.js";

export function AdminOverviewPage() {
  const { data: meData } = useCurrentUser();
  const orgMembership = meData?.organizations?.[0];
  const orgId = orgMembership?.organizationId?._id || null;

  const { data: overviewData, isLoading } = useAdminOverview(orgId);

  const metrics = overviewData?.overview?.metrics || {
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    maintainersCount: 0,
    developersCount: 0,
    pendingInvitationsCount: 0,
  };

  const projectBreakdown = overviewData?.overview?.projectBreakdown || [];
  const recentActivity = overviewData?.overview?.recentActivity || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-7xl mx-auto w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Admin Overview
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold uppercase">
              Admin Authority
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {orgMembership?.organizationId?.name || "Organization"} &bull;
            Real-time workspace analytics and access controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Manage Users</span>
          </Link>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs"
          >
            <span>My Projects</span>
            <span className="material-symbols-outlined text-[14px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* 6 Metric Cards per Requirements Section 9 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Total Users
          </div>
          <div className="text-2xl font-bold text-zinc-950 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.totalUsers}
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Active Users
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.activeUsers}
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Projects
          </div>
          <div className="text-2xl font-bold text-zinc-950 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.totalProjects}
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Maintainers
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.maintainersCount}
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Developers
          </div>
          <div className="text-2xl font-bold text-zinc-800 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.developersCount}
          </div>
        </div>

        <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Pending Invites
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-1 tracking-tight">
            {isLoading ? "—" : metrics.pendingInvitationsCount}
          </div>
        </div>
      </div>

      {/* Two Columns: Project Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Breakdown Table (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                Project Breakdown
              </h2>
              <p className="text-xs text-zinc-500">
                Membership distribution across active projects
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              {projectBreakdown.length} projects
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Project</th>
                  <th className="py-2.5 px-3">Total Members</th>
                  <th className="py-2.5 px-3">Maintainers</th>
                  <th className="py-2.5 px-3">Developers</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {projectBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      No project data available.
                    </td>
                  </tr>
                ) : (
                  projectBreakdown.map((p) => (
                    <tr
                      key={p.projectId}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-zinc-950">
                        <Link
                          to={`/projects/${p.projectId}/chat`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span>{p.name}</span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            ({p.slug})
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 font-mono">{p.totalMembers}</td>
                      <td className="py-3 px-3 font-mono text-amber-600 font-semibold">
                        {p.maintainers}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-700">
                        {p.developers}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit Activity Feed (1 col) */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs p-4 flex flex-col">
          <div className="pb-3 mb-3 border-b border-zinc-200/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-950">Recent Activity</h2>
            <span className="material-symbols-outlined text-[18px] text-zinc-400">
              history
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                No recent activity recorded.
              </div>
            ) : (
              recentActivity.map((act) => (
                <div
                  key={act._id}
                  className="text-xs p-2.5 rounded-xl bg-zinc-50/80 border border-zinc-200/60"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-semibold text-zinc-900 uppercase">
                      {act.action.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {new Date(act.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    By{" "}
                    <span className="font-medium text-zinc-900">
                      {act.actorUserId?.name || "System"}
                    </span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
