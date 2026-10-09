import React from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import { useUIStore } from "../../stores/useUIStore.js";

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const { openDialog } = useUIStore();

  const project = projectData?.project;

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto w-full select-none">
      <div className="pb-6 mb-8 border-b border-zinc-200/80">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
            Project Settings
          </h1>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase">
            Maintainer Authority
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          General configuration and lifecycle management
        </p>
      </div>

      <div className="space-y-6">
        {/* General Details Card */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-950 mb-4">
            General Configuration
          </h2>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                disabled
                value={project?.name || ""}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-sans cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Project Slug
              </label>
              <input
                type="text"
                disabled
                value={project?.slug || ""}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Description
              </label>
              <textarea
                disabled
                rows={2}
                value={project?.description || "No description provided."}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-sans cursor-not-allowed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone: Archive Project */}
        <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-rose-700 mb-1">Danger Zone</h2>
          <p className="text-xs text-zinc-600 mb-4">
            Archiving disables new messages, members, and sources. Historical
            conversations remain preserved.
          </p>

          <button
            type="button"
            onClick={() =>
              openDialog("ARCHIVE_PROJECT", {
                projectId,
                projectName: project?.name,
              })
            }
            className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Archive Project
          </button>
        </div>
      </div>
    </div>
  );
}
