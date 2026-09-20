import React from "react";

interface ToastProps {
  message: string | null;
  onClose?: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  if (!message) return null;

  return (
    <div
      id="toast"
      aria-live="polite"
      className="bg-zinc-900 text-white text-xs font-mono px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-2 border border-zinc-800 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[15px] text-emerald-400">
          check_circle
        </span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer"
        >
          <span className="material-symbols-outlined text-[13px]">close</span>
        </button>
      )}
    </div>
  );
}
