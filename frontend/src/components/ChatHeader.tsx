interface ChatHeaderProps {
  currentTitle?: string;
  onToggleMobileSidebar: () => void;
  onNewSession: () => void;
  isStreaming?: boolean;
}

export function ChatHeader({
  currentTitle = "New Conversation",
  onToggleMobileSidebar,
  onNewSession,
  isStreaming = false,
}: ChatHeaderProps) {
  return (
    <header
      id="devai-header"
      className="h-14 shrink-0 z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-3.5 sm:px-6 sticky top-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile Hamburger Button to open sidebar drawer */}
        <button
          aria-label="Open sidebar"
          type="button"
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 -ml-1 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Current Active Conversation Title & Model indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-medium text-xs sm:text-sm text-zinc-900 truncate max-w-[200px] sm:max-w-md"
            title={currentTitle}
          >
            {currentTitle}
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-zinc-300"></span>
          <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-zinc-500 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200/80">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isStreaming ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"
              }`}
            ></span>
            <span>DevAI Core</span>
          </div>
        </div>
      </div>

      {/* Right side actions - "New Session" is in the sidebar for desktop; mobile provides a quick compact button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewSession}
          title="New Chat"
          className="md:hidden inline-flex items-center gap-1 text-xs text-zinc-900 bg-zinc-100 hover:bg-zinc-200 py-1.5 px-2.5 rounded-lg font-medium transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span className="hidden xs:inline">New</span>
        </button>
      </div>
    </header>
  );
}
