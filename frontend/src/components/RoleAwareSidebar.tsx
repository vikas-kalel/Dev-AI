import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useUIStore } from "../stores/useUIStore.js";
import { useCurrentUser } from "../hooks/useAuth.js";

interface RoleAwareSidebarProps {
  currentRole?: "ADMIN" | "MAINTAINER" | "DEVELOPER";
  projectId?: string;
  organizationId?: string;
}

export function RoleAwareSidebar({
  currentRole = "DEVELOPER",
  projectId,
  organizationId: _organizationId,
}: RoleAwareSidebarProps) {
  const {
    isNavSidebarOpen,
    toggleNavSidebar,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useUIStore();
  const { data: meData } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  const user = meData?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "DV";

  const closeMobile = () => setMobileSidebarOpen(false);

  const renderNavLinks = () => {
    if (currentRole === "ADMIN") {
      const adminLinks = [
        { label: "Overview", to: `/admin/overview`, icon: "dashboard" },
        { label: "Projects", to: `/admin/projects`, icon: "folder_open" },
        { label: "Users & Roles", to: `/admin/users`, icon: "group" },
        { label: "Organization", to: `/admin/settings`, icon: "settings" },
      ];

      return (
        <div className="space-y-1 px-3 py-2">
          <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Admin Authority
          </div>
          {adminLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.to);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobile}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      );
    }

    if (currentRole === "MAINTAINER" && projectId) {
      const maintainerLinks = [
        {
          label: "Chat",
          to: `/projects/${projectId}/chat`,
          icon: "chat_bubble",
        },
        {
          label: "Knowledge",
          to: `/projects/${projectId}/knowledge`,
          icon: "menu_book",
        },
        {
          label: "Sources",
          to: `/projects/${projectId}/sources`,
          icon: "integration_instructions",
        },
        {
          label: "Members",
          to: `/projects/${projectId}/members`,
          icon: "badge",
        },
        {
          label: "Settings",
          to: `/projects/${projectId}/settings`,
          icon: "settings",
        },
      ];

      return (
        <div className="space-y-1 px-3 py-2">
          <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Project Navigation
          </div>
          {maintainerLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobile}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      );
    }

    // Default Developer view: Chat focus
    if (projectId) {
      return (
        <div className="space-y-1 px-3 py-2">
          <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
            Workspace
          </div>
          <NavLink
            to={`/projects/${projectId}/chat`}
            onClick={closeMobile}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              location.pathname.includes("/chat")
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              chat_bubble
            </span>
            <span>Project Chat</span>
          </NavLink>
        </div>
      );
    }

    return null;
  };

  const renderContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-zinc-50/70 border-r border-zinc-200 select-none">
      {/* Sidebar Header */}
      <div className="h-14 shrink-0 flex items-center justify-between px-3.5 border-b border-zinc-200/90 bg-white">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-zinc-500">
            dashboard
          </span>
          <span className="font-semibold text-xs uppercase tracking-wider text-zinc-700">
            {currentRole === "ADMIN" ? "Admin" : "Workspace"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => (isMobile ? closeMobile() : toggleNavSidebar())}
          title={isMobile ? "Close navigation" : "Collapse navigation"}
          className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isMobile ? "close" : "left_panel_close"}
          </span>
        </button>
      </div>

      {/* Switch project shortcut button */}
      <div className="p-3 pb-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            navigate("/projects");
            if (isMobile) closeMobile();
          }}
          className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-200/90 rounded-xl text-xs font-medium transition-all shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="material-symbols-outlined text-[16px] text-zinc-500">
              sync_alt
            </span>
            <span className="truncate">Switch Project</span>
          </div>
          <span className="material-symbols-outlined text-[14px] text-zinc-400">
            chevron_right
          </span>
        </button>
      </div>

      {/* Navigation Links according to role */}
      <div className="flex-1 overflow-y-auto py-2">{renderNavLinks()}</div>

      {/* Footer Profile card */}
      <div className="p-3 border-t border-zinc-200 bg-white/90 shrink-0">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-zinc-100 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-950 truncate leading-tight">
                {user?.name || "Developer"}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 truncate leading-tight">
                {user?.email || "dev@devai.local"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        onClick={closeMobile}
        className={`fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300 ${
          isMobileSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Mobile Off-Canvas Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col border-r border-zinc-200 shadow-2xl ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderContent(true)}
      </div>

      {/* Desktop Persistent Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-full select-none transition-all duration-200 ease-in-out ${
          isNavSidebarOpen ? "md:w-60" : "md:w-0 overflow-hidden"
        }`}
      >
        {isNavSidebarOpen && renderContent(false)}
      </aside>
    </>
  );
}
