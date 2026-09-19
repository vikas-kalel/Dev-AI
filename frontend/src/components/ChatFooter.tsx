export function ChatFooter() {
  return (
    <footer
      id="devai-footer"
      className="fixed bottom-0 inset-x-0 h-7 z-20 bg-white border-t border-zinc-200 flex items-center justify-center px-3 sm:px-4"
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
