import React, { useState } from "react";
import { useUIStore } from "../../stores/useUIStore.js";
import { useAddMember } from "../../hooks/useMembers.js";

export function InviteMemberDialog() {
  const { activeDialog, dialogData, closeDialog } = useUIStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"DEVELOPER" | "MAINTAINER">("DEVELOPER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutate: addMember, isPending } = useAddMember();

  if (activeDialog !== "INVITE_MEMBER" || !dialogData?.projectId) {
    return null;
  }

  const handleClose = () => {
    setEmail("");
    setInviteLink(null);
    setCopied(false);
    closeDialog();
  };

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
        onSuccess: (data: any) => {
          if (data?.type === "INVITATION" && data?.data?.rawToken) {
            const link = `${window.location.origin}/invite/${data.data.rawToken}`;
            setInviteLink(link);
          } else {
            handleClose();
          }
        },
      },
    );
  };

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">
                {inviteLink ? "mark_email_read" : "person_add"}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">
                {inviteLink ? "Invitation Link Ready" : "Invite Member"}
              </h3>
              <p className="text-xs text-zinc-500">
                {inviteLink
                  ? "Share this link with your team member"
                  : "Add a developer or maintainer to this project"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="text-xs text-zinc-600 mb-2">
                An invitation for <strong>{email}</strong> was created. You can
                share this direct link:
              </p>
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg p-1.5">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full text-xs font-mono text-zinc-800 bg-transparent px-2 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-all shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[16px] shrink-0 mt-0.5">
                info
              </span>
              <span>
                If SMTP is not configured in <code>backend/.env</code>, emails
                are logged in development mode. You can copy the link above and
                send it directly.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
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
                onClick={handleClose}
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
        )}
      </div>
    </div>
  );
}
