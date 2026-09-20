import React, { useState } from "react";
import { useUIStore } from "../../stores/useUIStore.js";
import { useChangeRole } from "../../hooks/useMembers.js";
import { ProjectRole } from "../../types/member.js";

export function ChangeRoleDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("DEVELOPER");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: changeRole, isPending } = useChangeRole();

  if (activeDialog !== "CHANGE_ROLE" || !dialogData) {
    return null;
  }

  const { projectId, userId, currentRole, memberName, projectName } =
    dialogData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    changeRole(
      {
        projectId,
        userId,
        role: selectedRole,
      },
      {
        onSuccess: () => {
          closeDialog();
        },
        onError: (err: any) => {
          if (err.code === "LAST_MAINTAINER") {
            setErrorMessage(
              "Cannot change role: This project must retain at least one Maintainer. Assign another Maintainer first.",
            );
          } else {
            setErrorMessage(err.message || "Failed to update role.");
          }
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
                manage_accounts
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Change Role
              </h3>
              <p className="text-xs text-zinc-500">
                {memberName} in {projectName || "project"}
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

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-rose-600 mt-0.5 shrink-0">
              warning
            </span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs text-zinc-600 mb-2">
            Current role:{" "}
            <span className="font-semibold text-zinc-900">{currentRole}</span>
          </div>

          <div className="space-y-2">
            <label
              onClick={() => setSelectedRole("DEVELOPER")}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedRole === "DEVELOPER"
                  ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={selectedRole === "DEVELOPER"}
                onChange={() => setSelectedRole("DEVELOPER")}
                className="mt-0.5"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-950">
                  Developer
                </div>
                <div className="text-[11px] text-zinc-500">
                  Access to project chat and temporary conversation file
                  uploads.
                </div>
              </div>
            </label>

            <label
              onClick={() => setSelectedRole("MAINTAINER")}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedRole === "MAINTAINER"
                  ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                checked={selectedRole === "MAINTAINER"}
                onChange={() => setSelectedRole("MAINTAINER")}
                className="mt-0.5"
              />
              <div>
                <div className="text-xs font-semibold text-zinc-950">
                  Maintainer
                </div>
                <div className="text-[11px] text-zinc-500">
                  Full management of project members, sources, and knowledge.
                </div>
              </div>
            </label>
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
              disabled={isPending || selectedRole === currentRole}
              className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isPending ? "Updating..." : "Confirm Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
