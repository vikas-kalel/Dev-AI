import { useEffect, useRef } from "react";
import { MessageItem } from "./MessageItem.tsx";
import type { ChatMessage } from "../types/chat.ts";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
  onRetry: (message: ChatMessage) => void;
  onToast: (msg: string) => void;
  onStop?: () => void;
}

const PROMPT_STARTERS = [
  {
    icon: "schema",
    title: "Summarize system architecture options",
    prompt: "Summarize system architecture options for high-throughput AI services.",
  },
  {
    icon: "memory",
    title: "Explain token window limitations",
    prompt: "Explain token window limitations and self-attention computational complexity.",
  },
  {
    icon: "code",
    title: "Draft an idiomatic SSE client",
    prompt: "Draft an idiomatic API client interface for streaming server-sent events in TypeScript.",
  },
  {
    icon: "tune",
    title: "Compare latency vs throughput trade-offs",
    prompt: "Compare latency vs. throughput trade-offs in quantized vs FP16 model weights.",
  },
];

export function MessageList({
  messages,
  isLoading,
  onSelectPrompt,
  onRetry,
  onToast,
  onStop,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const hasActiveStreamingMessage =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    messages[messages.length - 1]?.status === "streaming";

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 pt-4 pb-2 sm:pt-6 sm:pb-3 flex flex-col">
      {/* Session Header / Empty State Starter */}
      <div className="flex flex-col items-center mb-8 sm:mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100/80 border border-zinc-200 mb-3 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-900"></span>
          <span className="font-mono text-[10px] sm:text-[11px] text-zinc-700 uppercase tracking-widest font-medium">
            Inference Engine
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 mb-2">
          Developer Workspace
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-md leading-relaxed px-2">
          Minimalist, high-throughput language model environment for code generation and engineering architecture.
        </p>
      </div>

      {/* Prompt Starters Deck */}
      {messages.length === 0 && (
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">terminal</span>
              Prompt Starters
            </span>
            <span className="text-xs text-zinc-400">Click to insert</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="prompt-deck">
            {PROMPT_STARTERS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                className="group text-left p-3 sm:p-3.5 bg-white hover:bg-zinc-50 border border-zinc-200/90 hover:border-zinc-300 rounded-xl transition-all shadow-xs flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-500 group-hover:text-zinc-900 group-hover:bg-zinc-200 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  </div>
                  <span className="text-xs text-zinc-700 group-hover:text-zinc-950 font-medium truncate">
                    {item.title}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[14px] text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-all ml-2 flex-shrink-0">
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Transcript */}
      <div className="flex flex-col space-y-6 sm:space-y-8" id="chat-stream">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onRetry={onRetry}
            onToast={onToast}
            onStop={onStop}
          />
        ))}

        {/* Live Loading Indicator (shown only if no active streaming assistant message in transcript) */}
        {isLoading && !hasActiveStreamingMessage && (
          <div className="flex items-start gap-2.5 sm:gap-3.5 pr-0 sm:pr-2" id="streaming-turn">
            <div className="w-7 h-7 rounded-md bg-zinc-900 flex-shrink-0 flex items-center justify-center text-white text-[13px] font-mono font-semibold mt-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            </div>
            <div className="flex flex-col flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-950">DevAI</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
                    Core
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onStop && (
                    <button
                      type="button"
                      onClick={onStop}
                      title="Stop generation"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-medium transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-[1px] bg-rose-600"></span>
                      <span>Stop</span>
                    </button>
                  )}
                  <span className="font-mono text-[10px] sm:text-[11px] text-zinc-400">
                    Generating response...
                  </span>
                </div>
              </div>
              <div className="border border-zinc-200 bg-white rounded-xl p-3.5 sm:p-4 space-y-3.5 text-sm text-zinc-800 leading-relaxed shadow-sm">
                <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping"></span>
                  <span>Generating response...</span>
                  <span className="inline-block w-1.5 h-3.5 bg-zinc-900 ml-1.5 align-middle animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
}
