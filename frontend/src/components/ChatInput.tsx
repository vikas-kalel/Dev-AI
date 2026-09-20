import React, { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  onScrollBottom?: () => void;
  showScrollBottom?: boolean;
  isLoading: boolean;
  initialValue?: string;
  onToast?: (msg: string) => void;
  onFileUpload?: (file: File) => void;
}

const MAX_CHARS = 2048;

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function ChatInput({
  onSend,
  onStop,
  onScrollBottom,
  showScrollBottom = false,
  isLoading,
  initialValue = "",
  onToast = () => {},
  onFileUpload,
}: ChatInputProps) {
  const [text, setText] = useState(initialValue);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isVoiceEnabledRef = useRef(false);
  const baseTextRef = useRef(initialValue);
  const currentTextRef = useRef(initialValue);

  useEffect(() => {
    isVoiceEnabledRef.current = isVoiceEnabled;
  }, [isVoiceEnabled]);

  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      currentTextRef.current = initialValue;
      baseTextRef.current = initialValue;
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${Math.max(newHeight, 44)}px`;
  }, [text]);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      isVoiceEnabledRef.current = false;
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  const startListeningLoop = useCallback(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      onToast("Speech recognition is not supported in this browser");
      setIsVoiceEnabled(false);
      isVoiceEnabledRef.current = false;
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      // Snapshot the current text as the baseline so new speech doesn't duplicate
      baseTextRef.current = currentTextRef.current.trim();

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalChunk = "";
        let interimChunk = "";

        // Properly aggregate only confirmed final words and the single active interim fragment
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          const segment = res[0].transcript.trim();
          if (!segment) continue;

          if (res.isFinal) {
            finalChunk += (finalChunk ? " " : "") + segment;
          } else {
            interimChunk += (interimChunk ? " " : "") + segment;
          }
        }

        const recognizedUtterance = [finalChunk, interimChunk]
          .filter(Boolean)
          .join(" ");
        const base = baseTextRef.current.trim();
        const nextText = base
          ? recognizedUtterance
            ? `${base} ${recognizedUtterance}`
            : base
          : recognizedUtterance;

        setText(nextText);
        currentTextRef.current = nextText;
      };

      recognition.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setIsVoiceEnabled(false);
          isVoiceEnabledRef.current = false;
          setIsListening(false);
          onToast("Microphone permission denied");
          return;
        }
        // Silence or pause is expected, keep loop alive
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition notice:", e.error);
        }
      };

      recognition.onend = () => {
        // Update baseline to the finalized text so subsequent words append cleanly
        baseTextRef.current = currentTextRef.current.trim();

        // User has voice input enabled - do not close voice! Restart listening seamlessly:
        if (isVoiceEnabledRef.current) {
          setTimeout(() => {
            if (isVoiceEnabledRef.current) {
              try {
                recognition.start();
                setIsListening(true);
              } catch {
                startListeningLoop();
              }
            }
          }, 150);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition initialization error:", err);
      setIsListening(false);
    }
  }, [onToast]);

  const toggleVoiceInput = () => {
    if (isVoiceEnabled) {
      setIsVoiceEnabled(false);
      isVoiceEnabledRef.current = false;
      cleanupRecognition();
      baseTextRef.current = currentTextRef.current.trim();
      onToast("Voice input disabled");
    } else {
      setIsVoiceEnabled(true);
      isVoiceEnabledRef.current = true;
      baseTextRef.current = currentTextRef.current.trim();
      startListeningLoop();
      onToast("Voice input enabled · Speak anytime");
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = text.trim();
    if (!query || isLoading) return;

    // Automatically turn off voice input when clicking Generate or submitting
    if (isVoiceEnabled || isVoiceEnabledRef.current) {
      setIsVoiceEnabled(false);
      isVoiceEnabledRef.current = false;
      cleanupRecognition();
      baseTextRef.current = "";
    }

    onSend(query);
    setText("");
    currentTextRef.current = "";
    baseTextRef.current = "";

    if (textareaRef.current) {
      textareaRef.current.style.height = "44px";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && isLoading && onStop) {
      e.preventDefault();
      onStop();
    }
  };

  const charCount = text.length;

  // Global Esc key listener during active generation
  useEffect(() => {
    if (!isLoading || !onStop) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onStop();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isLoading, onStop]);

  return (
    <div
      id="composer-dock"
      className="absolute inset-x-0 z-30 pointer-events-none bottom-10 sm:bottom-10"
    >
      <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 pointer-events-auto flex flex-col items-center">
        {/* Scroll to bottom button: ONLY visible when generation is in progress AND user is scrolled up */}
        {showScrollBottom && onScrollBottom && (
          <div className="mb-2">
            <button
              id="scroll-to-bottom-btn"
              type="button"
              onClick={onScrollBottom}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 hover:bg-white text-zinc-700 hover:text-zinc-950 border border-zinc-200/90 rounded-full text-xs font-medium shadow-sm transition-all hover:border-zinc-300 cursor-pointer animate-fade-in"
            >
              <span className="material-symbols-outlined text-[14px]">
                arrow_downward
              </span>
              <span>Scroll to bottom</span>
            </button>
          </div>
        )}

        {/* Composer Card */}
        <div className="w-full border hover:border-zinc-400 focus-within:border-zinc-900 rounded-2xl shadow-lg transition-all bg-white border-zinc-200">
          <form
            onSubmit={handleSubmit}
            className="p-2.5 sm:p-3.5 pb-2.5 flex flex-col"
          >
            <label className="sr-only" htmlFor="prompt-input">
              Type a prompt
            </label>
            <textarea
              ref={textareaRef}
              id="prompt-input"
              rows={2}
              value={text}
              maxLength={MAX_CHARS}
              onChange={(e) => {
                setText(e.target.value);
                currentTextRef.current = e.target.value;
                baseTextRef.current = e.target.value;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up or provide next requirements..."
              className="w-full bg-transparent resize-none border-0 text-zinc-950 placeholder:text-zinc-400 text-sm focus:ring-0 focus:outline-hidden min-h-[44px] max-h-36 p-0 leading-relaxed"
            />

            {/* Bottom metadata and action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 border-t border-zinc-100">
              {/* Left: Character counter & Voice status badge */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  id="char-counter"
                  className="font-mono text-[10px] sm:text-[11px] text-zinc-400 flex-shrink-0"
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>

                {isVoiceEnabled && (
                  <span
                    id="voice-live-badge"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-600 font-medium"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>{isListening ? "Listening..." : "Voice ready"}</span>
                  </span>
                )}

                {text && (
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      currentTextRef.current = "";
                      baseTextRef.current = "";
                      if (textareaRef.current) textareaRef.current.focus();
                    }}
                    title="Clear input"
                    className="text-zinc-400 hover:text-zinc-700 text-[10px] font-mono hover:underline cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Right: Attach, Speech-to-Text, Stop & Generate */}
              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                {onFileUpload && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          onFileUpload(f);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file context"
                      className="h-7 px-2.5 rounded-full text-xs font-medium border border-zinc-200 hover:border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        attach_file
                      </span>
                      <span>Attach</span>
                    </button>
                  </>
                )}

                {/* Persistent voice input toggle button (Enable/Disable) */}
                <button
                  id="speech-to-text-btn"
                  type="button"
                  onClick={toggleVoiceInput}
                  title={
                    isVoiceEnabled
                      ? "Voice input is ON (click to disable)"
                      : "Voice input is OFF (click to enable)"
                  }
                  className={`h-7 px-2.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    isVoiceEnabled
                      ? "bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-800"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  {isVoiceEnabled ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span className="material-symbols-outlined text-[15px]">
                        mic
                      </span>
                      <span>Voice: ON</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">
                        mic_off
                      </span>
                      <span>Voice: OFF</span>
                    </>
                  )}
                </button>

                {isLoading ? (
                  <button
                    id="stop-generation-btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isVoiceEnabled || isVoiceEnabledRef.current) {
                        setIsVoiceEnabled(false);
                        isVoiceEnabledRef.current = false;
                        cleanupRecognition();
                      }
                      onStop?.();
                    }}
                    title="Stop generating (Esc)"
                    className="h-7 px-3 sm:px-3.5 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-[1px] bg-rose-400"></span>
                    <span>Stop</span>
                    <span className="font-mono text-[10px] text-zinc-400 hidden sm:inline">
                      Esc
                    </span>
                  </button>
                ) : (
                  <button
                    id="send-btn"
                    type="submit"
                    disabled={!text.trim()}
                    className="h-7 px-3 sm:px-3.5 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Generate</span>
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_upward
                    </span>
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
