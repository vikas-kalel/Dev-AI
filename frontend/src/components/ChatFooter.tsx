export function ChatFooter() {
  return (
    <footer
      id="devai-footer"
      className="h-7 shrink-0 z-20 bg-white border-t border-zinc-200 flex items-center justify-between px-3.5 sm:px-6 font-mono text-[10px] sm:text-[11px] text-zinc-600"
    >
      <div className="w-full max-w-3xl flex items-center justify-between font-mono text-[10px] sm:text-[11px] tracking-tight text-zinc-600 font-medium">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">DevAI · LLM Workspace</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-zinc-400">
          <span>Engine v1.0</span>
        </div>
      </div>
    </footer>
  );
}
