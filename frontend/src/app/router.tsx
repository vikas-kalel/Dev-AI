import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

// Layouts
import { AppLayout } from "../layouts/AppLayout.js";
import { AuthLayout } from "../layouts/AuthLayout.js";

// Auth Pages
import { LoginPage } from "../pages/auth/LoginPage.js";
import { SignupPage } from "../pages/auth/SignupPage.js";
import { VerifyEmailPage } from "../pages/auth/VerifyEmailPage.js";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage.js";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage.js";

// Onboarding
import { OnboardingPage } from "../pages/onboarding/OnboardingPage.js";

// Projects & Workspace
import { ProjectListPage } from "../pages/projects/ProjectListPage.js";
import { ChatWorkspacePage } from "../pages/workspace/ChatWorkspacePage.js";
import { KnowledgePage } from "../pages/workspace/KnowledgePage.js";
import { SourcesPage } from "../pages/workspace/SourcesPage.js";
import { MembersPage } from "../pages/workspace/MembersPage.js";
import { ProjectSettingsPage } from "../pages/workspace/ProjectSettingsPage.js";

// Admin
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage.js";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage.js";
import { AdminProjectsPage } from "../pages/admin/AdminProjectsPage.js";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage.js";

// Invitations
import { AcceptInvitationPage } from "../pages/invitations/AcceptInvitationPage.js";

export const router = createBrowserRouter([
  // Public Auth Routes
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },

  // Onboarding (Organization setup)
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },

  // Public/Authenticated Invitation acceptance
  {
    path: "/invite/:token",
    element: <AcceptInvitationPage />,
  },

  // Protected App Shell Routes
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/projects" replace /> },
      { path: "/projects", element: <ProjectListPage /> },

      // Admin Hierarchy
      { path: "/admin/overview", element: <AdminOverviewPage /> },
      { path: "/admin/users", element: <AdminUsersPage /> },
      { path: "/admin/projects", element: <AdminProjectsPage /> },
      { path: "/admin/settings", element: <AdminSettingsPage /> },

      // Project Workspace Hierarchy
      { path: "/projects/:projectId/chat", element: <ChatWorkspacePage /> },
      { path: "/projects/:projectId/knowledge", element: <KnowledgePage /> },
      { path: "/projects/:projectId/sources", element: <SourcesPage /> },
      { path: "/projects/:projectId/members", element: <MembersPage /> },
      {
        path: "/projects/:projectId/settings",
        element: <ProjectSettingsPage />,
      },
    ],
  },

  // Catch-all
  {
    path: "*",
    element: <Navigate to="/projects" replace />,
  },
]);
