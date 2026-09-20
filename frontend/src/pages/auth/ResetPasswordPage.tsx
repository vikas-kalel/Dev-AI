import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../../services/authService.js";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      await authService.resetPassword(email, token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message || "Failed to reset password. Link may have expired.",
      );
    } finally {
      setIsPending(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">
            check_circle
          </span>
        </div>
        <h3 className="text-base font-bold text-zinc-950">Password updated!</h3>
        <p className="text-xs text-zinc-600 mt-2 mb-6">
          Your password has been changed successfully. You can now log in with
          your new password.
        </p>
        <Link
          to="/login"
          className="inline-block py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs"
        >
          Sign in &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
          Set new password
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Choose a secure password for your account
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            New Password
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

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? "Updating..." : "Reset password"}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
        <Link
          to="/login"
          className="text-xs text-zinc-500 hover:text-zinc-950 transition-colors"
        >
          Cancel and return to Sign in
        </Link>
      </div>
    </div>
  );
}
