import React, { useState, useMemo, useRef, useEffect } from "react";
import type { ChatSession } from "../types/chat.ts";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  isMobileOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when rename starts
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  // Handle escape to close mobile sidebar
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Filter sessions by search query (matching title or message content)
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const titleMatch = s.title.toLowerCase().includes(q);
      const messageMatch = s.messages.some((m) =>
        m.content.toLowerCase().includes(q),
      );
      return titleMatch || messageMatch;
    });
  }, [sessions, searchQuery]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - oneDayMs;
    const sevenDaysStart = todayStart - 6 * oneDayMs;

    const groups: {
      label: string;
      items: ChatSession[];
    }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older", items: [] },
    ];

    for (const session of filteredSessions) {
      const sessionTime = new Date(
        session.updatedAt || session.createdAt,
      ).getTime();

      if (sessionTime >= todayStart) {
        groups[0].items.push(session);
      } else if (sessionTime >= yesterdayStart) {
        groups[1].items.push(session);
      } else if (sessionTime >= sevenDaysStart) {
        groups[2].items.push(session);
      } else {
        groups[3].items.push(session);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredSessions]);

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (sessionId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameSession(sessionId, trimmed);
    }
    setEditingSessionId(null);
  };

  const handleKeyDownRename = (
    sessionId: string,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveRename(sessionId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingSessionId(null);
    }
  };

  // Reusable Sidebar Content
  const renderSidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full">
      {/* 1. Brand Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-zinc-200/80 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono font-semibold text-xs shadow-xs">
            <span className="material-symbols-outlined text-[15px]">
              terminal
            </span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-zinc-950">
            DevAI
          </span>
        </div>

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-600 font-medium">
              v2.4
            </span>
          </div>
        )}
      </div>

      {/* 2. Primary Action: + New Chat */}
      <div className="p-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewSession();
            if (isMobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Chat</span>
          </div>
          <kbd className="font-mono text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700/50">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 3. Dedicated Conversation Search Bar */}
      <div className="px-3 pb-3 shrink-0">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-zinc-400 text-[15px] pointer-events-none">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-7 py-1.5 bg-white hover:border-zinc-300 focus:bg-white text-xs text-zinc-900 placeholder:text-zinc-400 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all font-sans shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-zinc-400 hover:text-zinc-700 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-[13px]">
                close
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Grouped Conversation History List */}
      <div className="flex-1 overflow-y-auto px-2.5 space-y-4 pr-1.5">
        {searchQuery && (
          <div className="px-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Results ({filteredSessions.length})
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 px-3 text-zinc-400 text-xs">
            {searchQuery
              ? "No matching conversations found"
              : "No previous chats"}
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.label}>
              <div className="px-2 mb-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = session.id === editingSessionId;

                  if (isEditing) {
                    return (
                      <div
                        key={session.id}
                        className="px-2 py-1.5 rounded-lg bg-white border border-zinc-900 shadow-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveRename(session.id)}
                          onKeyDown={(e) => handleKeyDownRename(session.id, e)}
                          className="w-full text-xs text-zinc-950 font-medium focus:outline-none bg-transparent"
                          placeholder="Conversation title"
                        />
                      </div>
                    );
                  }

                  if (isActive) {
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          onSelectSession(session.id);
                          if (isMobile) onCloseMobile();
                        }}
                        className="group relative flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-zinc-200/90 text-zinc-950 text-xs font-medium shadow-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate">{session.title}</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(session, e)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Rename"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              edit
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        onSelectSession(session.id);
                        if (isMobile) onCloseMobile();
                      }}
                      className="group relative flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-950 text-xs transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                        <span className="material-symbols-outlined text-[15px] text-zinc-400 shrink-0">
                          chat_bubble_outline
                        </span>
                        <span className="truncate">{session.title}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(session, e)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200/60 transition-colors cursor-pointer"
                          title="Rename"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            edit
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded hover:bg-zinc-200/60 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        id="mobile-drawer-backdrop"
        onClick={onCloseMobile}
        className={`fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300 ${
          isMobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Drawer Off-Canvas */}
      <div
        id="mobile-sidebar"
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col border-r border-zinc-200 shadow-2xl ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent(true)}
      </div>

      {/* Desktop Persistent Left Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex md:w-64 md:flex-col shrink-0 border-r border-zinc-200 bg-zinc-50/50 h-full select-none"
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
