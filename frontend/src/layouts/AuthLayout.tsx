import React from "react";
import { Outlet, Link } from "react-router-dom";
import { useUIStore } from "../stores/useUIStore.js";
import { Toast } from "../components/Toast.js";

export function AuthLayout() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-zinc-50 font-sans p-4 sm:p-6 select-none">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-zinc-950 text-white flex items-center justify-center font-mono font-semibold text-xs shadow-xs">
            <span className="material-symbols-outlined text-[16px]">
              terminal
            </span>
          </div>
          <span className="font-semibold text-base tracking-tight text-zinc-950">
            DevAI
          </span>
        </Link>
        <span className="font-mono text-[11px] text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded">
          Workspace v1.0
        </span>
      </div>

      {/* Centered Auth Card Container */}
      <div className="my-auto py-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-2xl shadow-sm p-6 sm:p-8">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center text-xs text-zinc-400 font-mono">
        © 2026 Dev AI Workspace. All rights reserved.
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
