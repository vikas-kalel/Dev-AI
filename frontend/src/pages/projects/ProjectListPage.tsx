import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useProjectList, useCreateProject } from "../../hooks/useProjects.js";

export function ProjectListPage() {
  const { data: meData, isLoading: isMeLoading } = useCurrentUser();
  const navigate = useNavigate();

  const orgMembership = meData?.organizations?.[0];
  const orgId = orgMembership?.organizationId?._id || null;
  const isOrgAdmin = orgMembership?.role === "ADMIN";

  const { data: projectsData, isLoading: isProjectsLoading } =
    useProjectList(orgId);
  const { mutate: createProject, isPending: isCreating } = useCreateProject();

  // Create project modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    const genSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(genSlug);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim() || !slug.trim()) return;

    createProject(
      {
        organizationId: orgId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setIsModalOpen(false);
          setName("");
          setSlug("");
          setDescription("");
          navigate(`/projects/${data.project._id}/chat`);
        },
      },
    );
  };

  const projects = projectsData?.projects || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-6xl mx-auto w-full">
      {/* Header with Organization and Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              My Projects
            </h1>
            {isOrgAdmin && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold uppercase">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {orgMembership?.organizationId?.name || "Organization"} &bull;
            Select a project to enter its developer workspace
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOrgAdmin && (
            <>
              <Link
                to="/admin/overview"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">
                  dashboard
                </span>
                <span>Admin Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                <span>New Project</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {isProjectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-zinc-100/70 border border-zinc-200 animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
          <div className="w-12 h-12 rounded-2xl bg-zinc-200/60 text-zinc-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[24px]">
              folder_open
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-950">
            No projects found
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {isOrgAdmin
              ? "Get started by creating your first project to enable project-centric AI conversations."
              : "You have not been assigned to any projects yet. Contact your organization administrator."}
          </p>
          {isOrgAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              + Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const role = project.role || "DEVELOPER";
            return (
              <div
                key={project._id}
                className="group relative flex flex-col justify-between p-5 bg-white hover:border-zinc-300 border border-zinc-200/90 rounded-2xl transition-all shadow-xs hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-zinc-950 tracking-tight truncate">
                      {project.name}
                    </h3>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                        role === "MAINTAINER"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {role}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 line-clamp-2 min-h-[32px]">
                    {project.description ||
                      "Project-aware developer inference workspace"}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span>slug: {project.slug}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Status: {project.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${project._id}/chat`)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-zinc-950 group-hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer"
                  >
                    <span>Open workspace</span>
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Project Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    create_new_folder
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">
                    Create New Project
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Add an engineering workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Payment Platform"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  placeholder="payment-platform"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment orchestration and fraud detection services"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-sans resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !name.trim() || !slug.trim()}
                  className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {isCreating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
