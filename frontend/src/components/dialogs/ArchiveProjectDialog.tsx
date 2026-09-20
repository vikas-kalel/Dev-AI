import React from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/useUIStore.js";
import { useArchiveProject } from "../../hooks/useProjects.js";

export function ArchiveProjectDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const { mutate: archiveProject, isPending } = useArchiveProject();
  const navigate = useNavigate();

  if (activeDialog !== "ARCHIVE_PROJECT" || !dialogData?.projectId) {
    return null;
  }

  const { projectId, projectName } = dialogData;

  const handleConfirm = () => {
    archiveProject(projectId, {
      onSuccess: () => {
        closeDialog();
        navigate("/projects");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              archive
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Archive {projectName}?
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Project lifecycle transition
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600 leading-relaxed mb-5">
          <p>
            The project will stop accepting new members, new conversations, and
            new sources. Historical records and conversations will remain
            preserved in read-only mode.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeDialog}
            className="px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isPending ? "Archiving..." : "Archive Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
