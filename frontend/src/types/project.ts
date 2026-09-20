export interface Project {
  _id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  role?: "MAINTAINER" | "DEVELOPER";
  isDirectMember?: boolean;
  isOrgAdmin?: boolean;
}
