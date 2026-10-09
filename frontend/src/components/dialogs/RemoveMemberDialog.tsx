import { useState } from "react";
import { useUIStore } from "../../stores/useUIStore.js";
import { useRemoveMember } from "../../hooks/useMembers.js";

export function RemoveMemberDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: removeMember, isPending } = useRemoveMember();

  if (activeDialog !== "REMOVE_MEMBER" || !dialogData) {
    return null;
  }

  const { projectId, userId, memberName, projectName } = dialogData;

  const handleConfirm = () => {
    setErrorMessage(null);
    removeMember(
      { projectId, userId },
      {
        onSuccess: () => {
          closeDialog();
        },
        onError: (err: any) => {
          if (err.code === "LAST_MAINTAINER") {
            setErrorMessage(
              "Cannot remove member: This project must retain at least one Maintainer. Assign another Maintainer first.",
            );
          } else {
            setErrorMessage(err.message || "Failed to remove member.");
          }
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">
              person_remove
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-950">
              Remove {memberName} from {projectName || "project"}?
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Revoke workspace access
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-rose-600 mt-0.5 shrink-0">
              warning
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-600 leading-relaxed mb-5">
          <p>
            <strong>{memberName}</strong> will immediately lose project access.
            Historical conversations, messages, and audit records will remain
            preserved.
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
            className="px-4 py-2 text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {isPending ? "Removing..." : "Remove Access"}
          </button>
        </div>
      </div>
    </div>
  );
}
