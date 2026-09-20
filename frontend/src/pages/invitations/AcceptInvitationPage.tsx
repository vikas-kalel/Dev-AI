import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { memberService } from "../../services/memberService.js";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useUIStore } from "../../stores/useUIStore.js";

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: meData, isLoading: isMeLoading } = useCurrentUser();
  const { showToast } = useUIStore();

  const [invitation, setInvitation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    memberService
      .getInvitation(token)
      .then((res) => {
        setInvitation(res.invitation);
      })
      .catch((err) => {
        setError(
          err.message ||
            "Failed to load invitation. Link may be invalid or expired.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      await memberService.acceptInvitation(token);
      showToast(
        "Invitation accepted! Welcome to the project workspace.",
        "success",
      );
      if (invitation?.projectId?._id) {
        navigate(`/projects/${invitation.projectId._id}/chat`);
      } else {
        navigate("/projects");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to accept invitation.", "error");
    } finally {
      setIsAccepting(false);
    }
  };

  const user = meData?.user;

  if (isLoading || isMeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
        <div className="text-center">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center mx-auto mb-2 animate-pulse">
            <span className="material-symbols-outlined text-[18px]">
              terminal
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Loading invitation...
          </span>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans p-4">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[24px]">
              cancel
            </span>
          </div>
          <h3 className="text-base font-bold text-zinc-950">
            Invalid or Expired Invitation
          </h3>
          <p className="text-xs text-zinc-600 mt-2 mb-6">
            {error || "This invitation link is no longer valid."}
          </p>
          <Link
            to="/login"
            className="inline-block px-4 py-2 bg-zinc-950 text-white text-xs font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-xs"
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans p-4 select-none">
      <div className="max-w-md w-full bg-white border border-zinc-200/90 rounded-2xl p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">mail</span>
        </div>

        <h2 className="text-lg font-bold text-zinc-950 tracking-tight">
          You've been invited!
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {invitation.invitedBy?.name || "An administrator"} invited you to join
        </p>

        <div className="my-6 p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-left">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
            Project Invitation
          </div>
          <div className="text-sm font-bold text-zinc-950">
            {invitation.projectId?.name}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {invitation.organizationId?.name}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-200/60 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Assigned Role:</span>
            <span className="font-mono font-semibold text-zinc-950 px-2 py-0.5 rounded bg-white border border-zinc-200">
              {invitation.invitedRole}
            </span>
          </div>
        </div>

        {user ? (
          <div>
            <p className="text-xs text-zinc-600 mb-4">
              Signed in as{" "}
              <span className="font-semibold text-zinc-900">{user.email}</span>
            </p>
            <button
              type="button"
              disabled={isAccepting}
              onClick={handleAccept}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isAccepting
                ? "Joining..."
                : "Accept Invitation & Open Workspace"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 mb-2">
              Please sign in or create an account to accept this invite.
            </p>
            <Link
              to="/signup"
              className="block w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="block w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-medium transition-all"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
