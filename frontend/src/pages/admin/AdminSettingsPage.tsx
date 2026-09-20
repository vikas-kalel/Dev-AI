import React from "react";
import { useCurrentUser } from "../../hooks/useAuth.js";

export function AdminSettingsPage() {
  const { data: meData } = useCurrentUser();
  const orgMembership = meData?.organizations?.[0];
  const org = orgMembership?.organizationId;

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto w-full select-none">
      <div className="pb-6 mb-8 border-b border-zinc-200/80">
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
          Organization Settings
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          General settings and identity policies
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-950 mb-4">
            Organization Profile
          </h2>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                disabled
                value={org?.name || ""}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-sans cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Organization Slug
              </label>
              <input
                type="text"
                disabled
                value={org?.slug || ""}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Organization ID
              </label>
              <input
                type="text"
                disabled
                value={org?._id || ""}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-xs">
          <h2 className="text-sm font-bold text-zinc-950 mb-2">
            Security & Invariants
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed mb-4">
            Dev AI Workspace enforces strict invariants:
          </p>
          <ul className="space-y-2 text-xs text-zinc-600">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                verified
              </span>
              <span>
                Last Admin Protection: Active organization Admins cannot be
                reduced below 1.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                verified
              </span>
              <span>
                Last Maintainer Protection: Projects must always retain at least
                one Maintainer.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                verified
              </span>
              <span>
                Project Isolation: All queries and AI inference are strictly
                scoped to verified project membership.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
