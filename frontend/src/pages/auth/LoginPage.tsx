import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../../hooks/useAuth.js";
import { authService } from "../../services/authService.js";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending } = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    login(
      { email, password },
      {
        onSuccess: async () => {
          // Load /me to determine routing according to state per Requirements 2.2
          try {
            const me = await authService.getMe();
            if (!me.organizations || me.organizations.length === 0) {
              navigate("/onboarding");
            } else if (me.projects && me.projects.length === 1) {
              navigate(`/projects/${me.projects[0].projectId._id}/chat`);
            } else {
              navigate("/projects");
            }
          } catch {
            navigate("/projects");
          }
        },
      },
    );
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
          Sign in to DevAI
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Project-centric developer inference workspace
        </p>
      </div>

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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-zinc-700">
              Password
            </label>
            <Link
              to={
                email
                  ? `/forgot-password?email=${encodeURIComponent(email)}`
                  : "/forgot-password"
              }
              className="text-[11px] text-zinc-500 hover:text-zinc-950 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
        >
          {isPending ? "Authenticating..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-500">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-zinc-950 font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
