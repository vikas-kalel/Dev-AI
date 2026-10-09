import { OrgRole } from "../models/OrganizationMembership.js";
import { ProjectRole } from "../models/ProjectMembership.js";

export type Permission =
  | "PROJECT_CHAT"
  | "PROJECT_ATTACHMENT_UPLOAD"
  | "PROJECT_VIEW_CONVERSATIONS"
  | "PROJECT_MANAGE_MEMBERS"
  | "PROJECT_INVITE_MEMBERS"
  | "PROJECT_CHANGE_ROLE"
  | "PROJECT_MANAGE_SOURCES"
  | "PROJECT_MANAGE_KNOWLEDGE"
  | "PROJECT_MANAGE_SETTINGS"
  | "ORG_MANAGE_PROJECTS"
  | "ORG_ARCHIVE_PROJECTS"
  | "ORG_MANAGE_MEMBERS"
  | "ORG_VIEW_REPORTING"
  | "ORG_VIEW_AUDIT";

const DEVELOPER_PERMISSIONS: Set<Permission> = new Set([
  "PROJECT_CHAT",
  "PROJECT_ATTACHMENT_UPLOAD",
  "PROJECT_VIEW_CONVERSATIONS",
]);

const MAINTAINER_PERMISSIONS: Set<Permission> = new Set([
  ...DEVELOPER_PERMISSIONS,
  "PROJECT_MANAGE_MEMBERS",
  "PROJECT_INVITE_MEMBERS",
  "PROJECT_CHANGE_ROLE",
  "PROJECT_MANAGE_SOURCES",
  "PROJECT_MANAGE_KNOWLEDGE",
  "PROJECT_MANAGE_SETTINGS",
]);

const ORG_ADMIN_PERMISSIONS: Set<Permission> = new Set([
  ...MAINTAINER_PERMISSIONS,
  "ORG_MANAGE_PROJECTS",
  "ORG_ARCHIVE_PROJECTS",
  "ORG_MANAGE_MEMBERS",
  "ORG_VIEW_REPORTING",
  "ORG_VIEW_AUDIT",
]);

export function hasProjectPermission(
  projectRole: ProjectRole | null | undefined,
  orgRole: OrgRole | null | undefined,
  permission: Permission,
): boolean {
  if (orgRole === "ADMIN") {
    return true; // Org Admin has full authority across org projects
  }

  if (projectRole === "MAINTAINER") {
    return MAINTAINER_PERMISSIONS.has(permission);
  }

  if (projectRole === "DEVELOPER") {
    return DEVELOPER_PERMISSIONS.has(permission);
  }

  return false;
}

export function hasOrgPermission(
  orgRole: OrgRole | null | undefined,
  permission: Permission,
): boolean {
  if (orgRole === "ADMIN") {
    return ORG_ADMIN_PERMISSIONS.has(permission);
  }
  return false;
}
