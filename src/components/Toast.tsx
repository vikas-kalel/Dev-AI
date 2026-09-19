interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div
      id="toast"
      aria-live="polite"
      className={`fixed top-16 right-6 z-50 transform transition-all duration-200 bg-zinc-900 text-white text-xs font-mono px-3 py-1.5 rounded shadow-lg flex items-center gap-1.5 ${
        message
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">check</span>
      <span>{message || ""}</span>
    </div>
  );
}
