import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../hooks/useAuth.js";
import { useUIStore } from "../stores/useUIStore.js";

interface TopBarProps {
  currentRole?: string;
  projectName?: string;
  orgName?: string;
}

export function TopBar({ currentRole, projectName, orgName }: TopBarProps) {
  const { data: meData } = useCurrentUser();
  const { mutate: logout } = useLogout();
  const { isNavSidebarOpen, toggleNavSidebar } = useUIStore();
  const navigate = useNavigate();

  const user = meData?.user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AI";

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };

  return (
    <header className="h-14 shrink-0 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 flex items-center justify-between px-3.5 sm:px-6 sticky top-0 z-30 select-none">
      {/* Left: Navigation toggle + Context Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label={
            isNavSidebarOpen ? "Collapse navigation" : "Expand navigation"
          }
          title={isNavSidebarOpen ? "Collapse navigation" : "Expand navigation"}
          onClick={toggleNavSidebar}
          className="p-1.5 -ml-1 text-zinc-600 hover:text-zinc-950 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer flex items-center"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isNavSidebarOpen ? "menu_open" : "menu"}
          </span>
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-900 min-w-0">
          <Link
            to="/projects"
            className="flex items-center gap-1.5 font-semibold tracking-tight text-zinc-950 hover:text-zinc-700 transition-colors"
          >
            <div className="w-5 h-5 rounded-md bg-zinc-950 text-white flex items-center justify-center font-mono text-[11px] shadow-xs">
              <span className="material-symbols-outlined text-[13px]">
                terminal
              </span>
            </div>
            <span className="hidden sm:inline">DevAI</span>
          </Link>

          {orgName && (
            <>
              <span className="text-zinc-400 font-normal">/</span>
              <span className="text-zinc-600 truncate max-w-[130px] sm:max-w-none">
                {orgName}
              </span>
            </>
          )}

          {projectName && (
            <>
              <span className="text-zinc-400 font-normal">/</span>
              <span className="font-semibold text-zinc-950 truncate max-w-[150px] sm:max-w-xs">
                {projectName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Role indicator badge, User Profile & Logout */}
      <div className="flex items-center gap-3">
        {currentRole && (
          <span
            className={`font-mono text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full font-medium border uppercase tracking-wider ${
              currentRole === "ADMIN"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : currentRole === "MAINTAINER"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {currentRole}
          </span>
        )}

        {/* User avatar & logout button */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
          <div
            title={`${user?.name || "User"} (${user?.email || ""})`}
            className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 shadow-xs"
          >
            {initials}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-zinc-500 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
