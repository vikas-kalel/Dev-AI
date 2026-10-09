import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { memberService } from "../../services/memberService.js";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useUIStore } from "../../stores/useUIStore.js";
import { useQueryClient } from "@tanstack/react-query";

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: meData, isLoading: isMeLoading } = useCurrentUser();
  const { showToast } = useUIStore();

  const [invitation, setInvitation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // In-place setup form state for unauthenticated invitees
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

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

  // Handler for already-authenticated users
  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    try {
      await memberService.acceptInvitation(token);
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
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

  // Handler for 1-click in-place setup (sets password and enters workspace)
  const handleDirectSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password) return;
    if (password.length < 8) {
      setSetupError("Password must be at least 8 characters long.");
      return;
    }

    setIsAccepting(true);
    setSetupError(null);
    try {
      const res = await memberService.acceptAndSignup(
        token,
        name.trim(),
        password,
      );
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showToast(
        `Welcome ${res.user.name || ""}! Workspace initialized.`,
        "success",
      );
      navigate(`/projects/${res.projectId}/chat`);
    } catch (err: any) {
      setSetupError(err.message || "Failed to complete setup.");
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
            {error || "This invitation link is no longer valid or has expired."}
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

  // Calculate days remaining until expiry
  const expiresDate = invitation?.expiresAt
    ? new Date(invitation.expiresAt)
    : null;
  const daysRemaining = expiresDate
    ? Math.max(
        0,
        Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 7;

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

        {/* Project & Role Info Card */}
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
            <span
              className={`font-mono font-semibold px-2 py-0.5 rounded border uppercase tracking-wider text-[11px] ${
                invitation.invitedRole === "MAINTAINER"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {invitation.invitedRole}
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
            <span>Link Expiry:</span>
            <span className="font-mono text-zinc-700 text-[11px] font-medium">
              {daysRemaining > 1
                ? `${daysRemaining} days remaining`
                : daysRemaining === 1
                  ? "Expires tomorrow"
                  : "Expires today"}
            </span>
          </div>
        </div>

        {/* Case 1: User is already signed in */}
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
                ? "Joining workspace..."
                : `Accept & Enter Workspace as ${invitation.invitedRole}`}
            </button>
          </div>
        ) : (
          /* Case 2: In-place 1-Click Setup Form for unauthenticated invitees */
          <div>
            {setupError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 text-left">
                {setupError}
              </div>
            )}

            <form
              onSubmit={handleDirectSetup}
              className="space-y-3.5 text-left"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Invited Email
                </label>
                <input
                  type="email"
                  disabled
                  value={invitation.email}
                  className="w-full px-3 py-2 text-xs bg-zinc-100/80 border border-zinc-200 rounded-xl text-zinc-600 cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Choose Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isAccepting || !password || password.length < 8}
                className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-1"
              >
                {isAccepting
                  ? "Setting up workspace..."
                  : `Set Password & Enter as ${invitation.invitedRole}`}
              </button>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <Link
                  to={`/login?inviteToken=${encodeURIComponent(token || "")}&email=${encodeURIComponent(invitation.email || "")}`}
                  className="text-zinc-600 hover:text-zinc-950 font-medium transition-colors"
                >
                  Already have an account? Sign in
                </Link>
                <Link
                  to={`/forgot-password?email=${encodeURIComponent(invitation.email || "")}`}
                  className="text-zinc-400 hover:text-zinc-700 text-[11px]"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
