import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { organizationService } from "../../services/organizationService.js";
import { useUIStore } from "../../stores/useUIStore.js";
import { useCurrentUser } from "../../hooks/useAuth.js";
import { useQueryClient } from "@tanstack/react-query";

export function OnboardingPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: meData } = useCurrentUser();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (meData?.organizations && meData.organizations.length > 0) {
      navigate("/projects", { replace: true });
    }
  }, [meData, navigate]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Auto-generate slug from name if user hasn't explicitly customized slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsPending(true);
    setError(null);
    try {
      await organizationService.createOrganization(name.trim(), slug.trim());
      await qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showToast(
        `Organization "${name}" created! You are now Organization Admin.`,
        "success",
      );
      navigate("/projects");
    } catch (err: any) {
      setError(err.message || "Failed to create organization.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 font-sans p-4 sm:p-6 select-none">
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-mono font-semibold text-xs shadow-xs">
            <span className="material-symbols-outlined text-[16px]">
              terminal
            </span>
          </div>
          <span className="font-semibold text-base tracking-tight text-zinc-950">
            DevAI
          </span>
        </div>
        <span className="font-mono text-[11px] text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded">
          Onboarding
        </span>
      </div>

      <div className="my-auto py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">
                corporate_fare
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
              Create your organization
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Establish your engineering organization workspace. You will become
              Organization Admin.
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
                Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="Acme Engineering"
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Organization Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="acme-engineering"
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                Used for URLs and API boundaries
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending || !name.trim() || !slug.trim()}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer mt-2"
            >
              {isPending ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-center text-xs text-zinc-400 font-mono">
        © 2026 Dev AI Workspace. All rights reserved.
      </div>
    </div>
  );
}
