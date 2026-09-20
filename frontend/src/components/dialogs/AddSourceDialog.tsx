import React, { useState } from "react";
import { useUIStore } from "../../stores/useUIStore.js";
import { useCreateSource } from "../../hooks/useSources.js";
import { KnowledgeSourceType } from "../../types/source.js";

export function AddSourceDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const [type, setType] = useState<KnowledgeSourceType>("GITHUB");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const { mutate: createSource, isPending } = useCreateSource();

  if (activeDialog !== "ADD_SOURCE" || !dialogData?.projectId) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createSource(
      {
        projectId: dialogData.projectId,
        type,
        name: name.trim(),
        config: {
          url: url.trim(),
          token: token.trim(),
          projectKey: projectKey.trim(),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setUrl("");
          setToken("");
          setProjectKey("");
          closeDialog();
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">
                add_link
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Connect Knowledge Source
              </h3>
              <p className="text-xs text-zinc-500">
                Integrate code or issue tracking repositories
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Source Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "GITHUB",
                  "JIRA",
                  "CONFLUENCE",
                  "MANUAL",
                ] as KnowledgeSourceType[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                    type === t
                      ? "border-zinc-950 bg-zinc-50 ring-1 ring-zinc-950 text-zinc-950"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Source Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Service Repo, Payments Jira"
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Repository / Host URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/org/repo or https://org.atlassian.net"
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Access Token / Secret (Encrypted at rest)
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxx or api-token"
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isPending ? "Connecting..." : "Connect Source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
