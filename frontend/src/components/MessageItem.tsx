import React, { useState } from "react";
import Markdown from "react-markdown";
import type { ChatMessage } from "../types/chat.ts";

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: (message: ChatMessage) => void;
  onToast?: (msg: string) => void;
  onStop?: () => void;
}

export function MessageItem({
  message,
  onRetry,
  onToast,
  onStop,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onToast?.("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      onToast?.("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div
        id={`message-user-${message.id}`}
        className="flex flex-col items-end pl-4 sm:pl-10"
      >
        <div className="flex items-center gap-2 mb-1.5 mr-1 font-mono text-[11px] text-zinc-400">
          <span>You</span>
          <span>·</span>
          <span>{formattedTime}</span>
        </div>
        <div className="bg-zinc-100 text-zinc-950 border border-zinc-200/80 rounded-2xl rounded-tr-sm px-3.5 sm:px-4 py-2.5 sm:py-3 max-w-full sm:max-w-2xl lg:max-w-4xl text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant Turn
  return (
    <div
      id={`message-assistant-${message.id}`}
      className="flex items-start gap-2.5 sm:gap-3.5 pr-0 sm:pr-2"
    >
      {/* DevAI Squircle Avatar */}
      <div className="w-7 h-7 rounded-md bg-zinc-900 flex-shrink-0 flex items-center justify-center text-white text-[13px] font-mono font-semibold mt-0.5 shadow-xs">
        <span className="material-symbols-outlined text-[15px]">
          auto_awesome
        </span>
      </div>

      <div className="flex flex-col flex-1 min-w-0 space-y-2">
        {/* Header meta */}
        <div className="flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-950">DevAI</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 font-medium">
              Core
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && onStop && (
              <button
                type="button"
                onClick={onStop}
                title="Stop generation (Esc)"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-medium transition-all cursor-pointer shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-[1px] bg-rose-600"></span>
                <span>Stop</span>
              </button>
            )}
            <span className="font-mono text-[10px] sm:text-[11px] text-zinc-400">
              {isStreaming ? (
                <span className="text-zinc-500 font-medium animate-pulse">
                  Generating response...
                </span>
              ) : (
                <>
                  {typeof message.tokens === "number"
                    ? `${message.tokens.toLocaleString()} tokens · `
                    : ""}
                  {message.durationMs
                    ? `${(message.durationMs / 1000).toFixed(1)}s`
                    : formattedTime}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Content Body Card */}
        {isError ? (
          <div className="border border-rose-200 bg-rose-50/50 rounded-xl p-3.5 sm:p-4 space-y-3 text-sm text-zinc-900 shadow-sm">
            <div className="flex items-center gap-2 text-rose-700 font-medium text-xs">
              <span className="material-symbols-outlined text-[16px]">
                error_outline
              </span>
              <span>Inference encountered an error</span>
            </div>
            <p className="text-xs text-rose-600 font-mono leading-relaxed break-words">
              {message.error || message.content}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">
                  refresh
                </span>
                <span>Retry Inference</span>
              </button>
            )}
          </div>
        ) : isStreaming && !message.content ? (
          <div className="border border-zinc-200 bg-white rounded-xl p-3.5 sm:p-4 space-y-3.5 text-sm text-zinc-800 leading-relaxed shadow-sm">
            <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
              <span className="w-2 h-2 rounded-full bg-zinc-900 animate-ping"></span>
              <span>Generating response...</span>
              <span className="inline-block w-1.5 h-3.5 bg-zinc-900 ml-1.5 align-middle animate-pulse"></span>
            </div>
          </div>
        ) : (
          <div className="border border-zinc-200 bg-white rounded-xl p-3.5 sm:p-4 space-y-3.5 text-sm text-zinc-800 leading-relaxed shadow-sm">
            <div className="markdown-body">
              <Markdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const rawText = String(children);
                    const isMultiline =
                      rawText.includes("\n") || Boolean(match);

                    if (!isMultiline) {
                      return (
                        <code
                          className="font-mono bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 text-[11px] border border-zinc-200"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    const lang = match ? match[1] : "code";
                    const cleanCode = rawText.replace(/\n$/, "");

                    return (
                      <div className="rounded-lg overflow-hidden border border-zinc-800 bg-[#09090b] text-zinc-100 text-xs shadow-inner my-2.5">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181b] border-b border-zinc-800 font-mono text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0"></span>
                            <span className="text-zinc-200 font-medium truncate">
                              {lang === "typescript" || lang === "ts"
                                ? "main.ts"
                                : lang === "javascript" || lang === "js"
                                  ? "main.js"
                                  : lang === "python" || lang === "py"
                                    ? "script.py"
                                    : `${lang}`}
                            </span>
                            <span className="text-zinc-500 text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 flex-shrink-0">
                              {lang}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(cleanCode)}
                            className="inline-flex items-center gap-1 hover:text-white transition-colors text-zinc-400 flex-shrink-0 ml-2 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              content_copy
                            </span>
                            <span>Copy code</span>
                          </button>
                        </div>
                        <pre className="p-3 sm:p-3.5 font-mono text-[11px] sm:text-[12px] leading-relaxed overflow-x-auto text-zinc-200">
                          <code>{cleanCode}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </Markdown>
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-zinc-900 ml-1 align-middle animate-pulse"></span>
              )}
            </div>
          </div>
        )}

        {/* Action bar */}
        {!isError && !isStreaming && (
          <div className="flex items-center gap-1 pt-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyText(message.content)}
              title="Copy response"
              className="h-6 px-2 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span className="font-mono text-[11px]">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>

            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message)}
                title="Regenerate turn"
                className="h-6 px-2 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">
                  refresh
                </span>
                <span className="font-mono text-[11px]">Retry</span>
              </button>
            )}

            <div className="w-px h-3 bg-zinc-200 mx-1"></div>

            <button
              type="button"
              onClick={() => {
                setFeedback(feedback === "up" ? null : "up");
                onToast?.(
                  feedback === "up" ? "Feedback reset" : "Marked as helpful",
                );
              }}
              title="Helpful"
              className={`h-6 w-6 rounded hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer ${
                feedback === "up"
                  ? "text-zinc-900 bg-zinc-100"
                  : "text-zinc-400 hover:text-zinc-800"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                thumb_up
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFeedback(feedback === "down" ? null : "down");
                onToast?.(
                  feedback === "down" ? "Feedback reset" : "Feedback noted",
                );
              }}
              title="Not helpful"
              className={`h-6 w-6 rounded hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer ${
                feedback === "down"
                  ? "text-rose-600 bg-rose-50"
                  : "text-zinc-400 hover:text-zinc-800"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                thumb_down
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
