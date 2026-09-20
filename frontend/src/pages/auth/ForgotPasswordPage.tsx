import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/authService.js";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsPending(true);
    setError(null);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setIsPending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">send</span>
        </div>
        <h3 className="text-base font-bold text-zinc-950">Check your email</h3>
        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
          If an account exists for{" "}
          <span className="font-semibold text-zinc-900">{email}</span>, we've
          dispatched a password reset link.
        </p>
        <div className="mt-6 pt-4 border-t border-zinc-100">
          <Link
            to="/login"
            className="text-xs font-semibold text-zinc-950 hover:underline"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
          Reset your password
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Enter your work email to receive instructions
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
            Work Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="developer@company.com"
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-sans"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? "Sending..." : "Send reset instructions"}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
        <Link
          to="/login"
          className="text-xs text-zinc-500 hover:text-zinc-950 transition-colors"
        >
          &larr; Back to Sign in
        </Link>
      </div>
    </div>
  );
}
