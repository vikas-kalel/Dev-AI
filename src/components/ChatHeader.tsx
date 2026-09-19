interface ChatHeaderProps {
  onNewSession: () => void;
}

export function ChatHeader({ onNewSession }: ChatHeaderProps) {
  return (
    <header
      id="devai-header"
      className="fixed top-0 inset-x-0 h-14 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 sm:px-6"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono font-semibold text-xs shadow-xs">
          <span className="material-symbols-outlined text-[15px]">terminal</span>
        </div>
        <span className="font-semibold text-[15px] tracking-tight text-zinc-950">DevAI</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          id="new-session-btn"
          type="button"
          onClick={onNewSession}
          title="New Session"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 transition-all py-1.5 px-3 rounded-full hover:bg-zinc-100 border border-zinc-200/80 bg-white/80 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span className="font-medium">New Session</span>
        </button>
      </div>
    </header>
  );
}
