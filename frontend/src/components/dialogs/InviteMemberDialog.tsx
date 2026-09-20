import React, { useState } from "react";
import { useUIStore } from "../../stores/useUIStore.js";
import { useAddMember } from "../../hooks/useMembers.js";

export function InviteMemberDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"DEVELOPER" | "MAINTAINER">("DEVELOPER");
  const { mutate: addMember, isPending } = useAddMember();

  if (activeDialog !== "INVITE_MEMBER" || !dialogData?.projectId) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    addMember(
      {
        projectId: dialogData.projectId,
        email: email.trim(),
        role,
      },
      {
        onSuccess: () => {
          setEmail("");
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
                person_add
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                Invite Member
              </h3>
              <p className="text-xs text-zinc-500">
                Add a developer or maintainer to this project
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
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Project Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("DEVELOPER")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "DEVELOPER"
                    ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-950">
                  Developer
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Chat & file context access
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("MAINTAINER")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  role === "MAINTAINER"
                    ? "border-zinc-950 bg-zinc-50/80 ring-1 ring-zinc-950"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <div className="font-semibold text-xs text-zinc-950">
                  Maintainer
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Manage members, sources & settings
                </div>
              </button>
            </div>
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
              disabled={isPending || !email.trim()}
              className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isPending ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
