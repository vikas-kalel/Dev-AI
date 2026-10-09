import { Link } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useProjectList } from "../../hooks/useProjects.js";
import { useUIStore } from "../../stores/useUIStore.js";

export function AdminProjectsPage() {
  const { data: meData } = useCurrentUser();
  const orgMembership = meData?.organizations?.[0];
  const orgId = orgMembership?.organizationId?._id || null;

  const { data: projectsData, isLoading } = useProjectList(orgId);
  const { openDialog } = useUIStore();
  const projects = projectsData?.projects || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-7xl mx-auto w-full select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200/80">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
            Project Governance
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Active and archived projects under{" "}
            {orgMembership?.organizationId?.name || "organization"}
          </p>
        </div>

        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs"
        >
          <span>Workspace View</span>
          <span className="material-symbols-outlined text-[14px]">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    No projects found.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-zinc-950">
                      <Link
                        to={`/projects/${p._id}/chat`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-500">
                      {p.slug}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-zinc-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/projects/${p._id}/chat`}
                          className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          Open
                        </Link>
                        {p.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() =>
                              openDialog("ARCHIVE_PROJECT", {
                                projectId: p._id,
                                projectName: p.name,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Archive
                          </button>
                        )}
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
