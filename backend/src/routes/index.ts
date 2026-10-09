import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  requireOrgRole,
  requireProjectRole,
} from "../middleware/rbacMiddleware.js";

// Controllers
import * as authCtrl from "../controllers/authController.js";
import * as orgCtrl from "../controllers/organizationController.js";
import * as projectCtrl from "../controllers/projectController.js";
import * as memberCtrl from "../controllers/membershipController.js";
import * as inviteCtrl from "../controllers/invitationController.js";
import * as convCtrl from "../controllers/conversationController.js";
import * as attachCtrl from "../controllers/attachmentController.js";
import * as sourceCtrl from "../controllers/sourceController.js";

export const v1Router = Router();

// --- Auth Routes ---
v1Router.post("/auth/signup", authCtrl.signup);
v1Router.post("/auth/verify-email", authCtrl.verifyEmail);
v1Router.post("/auth/login", authCtrl.login);
v1Router.post("/auth/logout", requireAuth, authCtrl.logout);
v1Router.post("/auth/forgot-password", authCtrl.forgotPassword);
v1Router.post("/auth/reset-password", authCtrl.resetPassword);
v1Router.get("/auth/me", requireAuth, authCtrl.getMe);

// --- Organization Routes ---
v1Router.post("/organizations", requireAuth, orgCtrl.createOrganization);
v1Router.get(
  "/organizations/:organizationId",
  requireAuth,
  orgCtrl.getOrganization,
);
v1Router.get(
  "/organizations/:organizationId/overview",
  requireAuth,
  requireOrgRole("ADMIN"),
  orgCtrl.getOrganizationOverview,
);
v1Router.get(
  "/organizations/:organizationId/users",
  requireAuth,
  requireOrgRole("ADMIN"),
  orgCtrl.getOrganizationUsers,
);

// --- Project Routes ---
v1Router.post(
  "/organizations/:organizationId/projects",
  requireAuth,
  requireOrgRole("ADMIN"),
  projectCtrl.createProject,
);
v1Router.get(
  "/organizations/:organizationId/projects",
  requireAuth,
  projectCtrl.listProjects,
);
v1Router.get(
  "/projects/:projectId",
  requireAuth,
  requireProjectRole(["MAINTAINER", "DEVELOPER"]),
  projectCtrl.getProject,
);
v1Router.post(
  "/projects/:projectId/archive",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  projectCtrl.archiveProject,
);

// --- Member Routes ---
v1Router.get(
  "/projects/:projectId/members",
  requireAuth,
  requireProjectRole(["MAINTAINER", "DEVELOPER"]),
  memberCtrl.listMembers,
);
v1Router.post(
  "/projects/:projectId/members",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  memberCtrl.addMember,
);
v1Router.patch(
  "/projects/:projectId/members/:userId",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  memberCtrl.changeRole,
);
v1Router.delete(
  "/projects/:projectId/members/:userId",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  memberCtrl.removeMember,
);

// --- Invitation Routes ---
v1Router.get("/invitations/:token", inviteCtrl.getInvitation);
v1Router.post("/invitations/:token/accept-signup", inviteCtrl.acceptAndSignup);
v1Router.post(
  "/invitations/:token/accept",
  requireAuth,
  inviteCtrl.acceptInvitation,
);
v1Router.post(
  "/invitations/:id/resend",
  requireAuth,
  inviteCtrl.resendInvitation,
);
v1Router.post(
  "/invitations/:id/revoke",
  requireAuth,
  inviteCtrl.revokeInvitation,
);

// --- Conversation Routes ---
v1Router.get(
  "/projects/:projectId/conversations",
  requireAuth,
  requireProjectRole(["MAINTAINER", "DEVELOPER"]),
  convCtrl.listConversations,
);
v1Router.post(
  "/projects/:projectId/conversations",
  requireAuth,
  requireProjectRole(["MAINTAINER", "DEVELOPER"]),
  convCtrl.createConversation,
);
v1Router.get(
  "/conversations/:conversationId",
  requireAuth,
  convCtrl.getConversation,
);
v1Router.post(
  "/conversations/:conversationId/messages/stream",
  requireAuth,
  convCtrl.streamMessage,
);
v1Router.post(
  "/conversations/:conversationId/messages",
  requireAuth,
  convCtrl.sendMessage,
);
v1Router.post(
  "/conversations/:conversationId/archive",
  requireAuth,
  convCtrl.archiveConversation,
);

// --- Attachment Routes ---
v1Router.post(
  "/conversations/:conversationId/attachments",
  requireAuth,
  attachCtrl.uploadMiddleware.single("file"),
  attachCtrl.uploadAttachment,
);
v1Router.delete(
  "/conversations/:conversationId/attachments/:attachmentId",
  requireAuth,
  attachCtrl.removeAttachment,
);

// --- Source Routes ---
v1Router.get(
  "/projects/:projectId/sources",
  requireAuth,
  requireProjectRole(["MAINTAINER", "DEVELOPER"]),
  sourceCtrl.listSources,
);
v1Router.post(
  "/projects/:projectId/sources",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  sourceCtrl.createSource,
);
v1Router.patch(
  "/projects/:projectId/sources/:sourceId",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  sourceCtrl.updateSource,
);
v1Router.delete(
  "/projects/:projectId/sources/:sourceId",
  requireAuth,
  requireProjectRole(["MAINTAINER"]),
  sourceCtrl.disconnectSource,
);
