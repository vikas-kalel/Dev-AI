import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignup } from "../../hooks/useAuth.js";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const { mutate: signup, isPending } = useSignup();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    signup(
      { name, email, password },
      {
        onSuccess: (data: any) => {
          setVerificationSent(true);
          if (data.verificationToken) {
            setDevToken(data.verificationToken);
          }
        },
      },
    );
  };

  if (verificationSent) {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">
            mark_email_read
          </span>
        </div>
        <h3 className="text-base font-bold text-zinc-950">Verify your email</h3>
        <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
          We sent a verification link to{" "}
          <span className="font-semibold text-zinc-900">{email}</span>. Please
          verify your email address to activate your account.
        </p>

        {devToken && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-left">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block mb-1">
              Development Quick-Verify Link:
            </span>
            <Link
              to={`/verify-email?token=${devToken}&email=${encodeURIComponent(email)}`}
              className="text-xs font-mono text-indigo-600 hover:underline break-all"
            >
              Click here to verify now &rarr;
            </Link>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-100">
          <Link
            to="/login"
            className="inline-block text-xs font-medium text-zinc-950 hover:underline"
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
          Create your account
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Get started with DevAI workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Full Name
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

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1.5">
            Password
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
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-zinc-950 font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
