import React from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../hooks/useProjects.js";
import {
  useProjectSources,
  useDisconnectSource,
} from "../../hooks/useSources.js";
import { useUIStore } from "../../stores/useUIStore.js";

export function SourcesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: projectData } = useProject(projectId || null);
  const { data: sourcesData, isLoading } = useProjectSources(projectId || null);
  const { mutate: disconnectSource } = useDisconnectSource();
  const { openDialog } = useUIStore();

  const sources = sourcesData?.sources || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-6xl mx-auto w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Knowledge Sources
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold uppercase">
              Maintainer Authority
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Connect external repositories and issue trackers for{" "}
            {projectData?.project?.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openDialog("ADD_SOURCE", { projectId })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            add_link
          </span>
          <span>Connect Source</span>
        </button>
      </div>

      {/* Available Integration Types Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
        {[
          {
            type: "GitHub",
            icon: "code",
            desc: "Repositories & Pull Requests",
          },
          { type: "Jira", icon: "task_alt", desc: "Epics, Stories & Bugs" },
          {
            type: "Confluence",
            icon: "menu_book",
            desc: "Team documentation spaces",
          },
          {
            type: "Manual",
            icon: "folder_shared",
            desc: "Uploaded project specifications",
          },
        ].map((item) => (
          <div
            key={item.type}
            className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                {item.icon}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-950">
                {item.type}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">
                {item.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connected Sources List */}
      <div>
        <h2 className="text-sm font-bold text-zinc-950 mb-3">
          Active Connections
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-zinc-400 text-xs">
            Loading sources...
          </div>
        ) : sources.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 border border-zinc-200/80 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-zinc-200/60 text-zinc-600 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-[20px]">
                link_off
              </span>
            </div>
            <h3 className="text-xs font-semibold text-zinc-900">
              No external sources connected
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto">
              Maintainers can connect GitHub repositories, Jira instances, and
              Confluence spaces to establish project context.
            </p>
            <button
              type="button"
              onClick={() => openDialog("ADD_SOURCE", { projectId })}
              className="mt-3 px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Connect First Source
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source._id}
                className="p-4 bg-white border border-zinc-200/90 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    {source.type.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-950 truncate">
                        {source.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wider ${
                          source.status === "CONNECTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : source.status === "SYNCING"
                              ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                              : source.status === "ERROR"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {source.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5 truncate">
                      {source.metadata?.url || `Source type: ${source.type}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-zinc-400">
                    Synced:{" "}
                    {source.lastSyncedAt
                      ? new Date(source.lastSyncedAt).toLocaleDateString()
                      : "Never"}
                  </span>
                  {source.status !== "DISCONNECTED" && (
                    <button
                      type="button"
                      onClick={() =>
                        projectId &&
                        disconnectSource({ projectId, sourceId: source._id })
                      }
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
