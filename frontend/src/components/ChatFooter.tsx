export function ChatFooter() {
  return (
    <footer
      id="devai-footer"
      className="h-8 shrink-0 z-20 bg-white/95 backdrop-blur-xs border-t border-zinc-200/80 flex items-center justify-center px-3.5 sm:px-6 select-none"
    >
      <div className="w-full max-w-3xl mx-auto flex items-center justify-between font-mono text-[10px] sm:text-[11px] tracking-tight text-zinc-500 font-medium">
        <div className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate">DevAI · Project LLM Workspace</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-zinc-400">
          <span>Gemini 2.5</span>
          <span>·</span>
          <span>v1.0</span>
        </div>
      </div>
    </footer>
  );
}
