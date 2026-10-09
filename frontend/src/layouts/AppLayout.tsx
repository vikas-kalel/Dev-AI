import React, { useEffect } from "react";
import { Outlet, useParams, useNavigate, useLocation } from "react-router-dom";
import { TopBar } from "../components/TopBar.js";
import { RoleAwareSidebar } from "../components/RoleAwareSidebar.js";
import { useCurrentUser } from "../hooks/useAuth.js";
import { useProject } from "../hooks/useProjects.js";
import { useUIStore } from "../stores/useUIStore.js";
import { Toast } from "../components/Toast.js";

// Dialog components
import { InviteMemberDialog } from "../components/dialogs/InviteMemberDialog.js";
import { ChangeRoleDialog } from "../components/dialogs/ChangeRoleDialog.js";
import { RemoveMemberDialog } from "../components/dialogs/RemoveMemberDialog.js";
import { AddSourceDialog } from "../components/dialogs/AddSourceDialog.js";
import { ArchiveProjectDialog } from "../components/dialogs/ArchiveProjectDialog.js";

export function AppLayout() {
  const { projectId } = useParams<{ projectId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: meData, isLoading: isMeLoading } = useCurrentUser();
  const { data: projectData } = useProject(projectId || null);
  const { toasts, removeToast } = useUIStore();

  // Determine current active role & routing context
  const isAdminRoute = location.pathname.startsWith("/admin");
  const orgMembership = meData?.organizations?.[0];
  const isOrgAdmin = orgMembership?.role === "ADMIN";

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isMeLoading && !meData?.user) {
      navigate("/login");
    }
  }, [meData, isMeLoading, navigate]);

  // Redirect non-admin users trying to access /admin routes to /projects
  useEffect(() => {
    if (!isMeLoading && meData?.user) {
      if (isAdminRoute && !isOrgAdmin) {
        navigate("/projects", { replace: true });
      }
    }
  }, [isAdminRoute, isOrgAdmin, isMeLoading, meData, navigate]);

  let currentRole: "ADMIN" | "MAINTAINER" | "DEVELOPER" = "DEVELOPER";
  if (isOrgAdmin && (isAdminRoute || !projectId)) {
    currentRole = "ADMIN";
  } else if (projectData?.project?.role === "MAINTAINER" || isOrgAdmin) {
    currentRole = "MAINTAINER";
  }

  const projectName = projectData?.project?.name;
  const orgName = orgMembership?.organizationId?.name;

  if (isMeLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-[18px]">
              terminal
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            Loading DevAI Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-50 font-sans">
      {/* Top Header */}
      <TopBar
        currentRole={currentRole}
        projectName={projectName}
        orgName={orgName}
      />

      {/* Main Container: Sidebar + Page content */}
      <div className="flex-1 flex overflow-hidden">
        <RoleAwareSidebar
          currentRole={currentRole}
          projectId={projectId}
          organizationId={orgMembership?.organizationId?._id}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* Global Modals / Dialogs */}
      <InviteMemberDialog />
      <ChangeRoleDialog />
      <RemoveMemberDialog />
      <AddSourceDialog />
      <ArchiveProjectDialog />

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
