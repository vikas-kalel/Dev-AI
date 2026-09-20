export type ProjectRole = "MAINTAINER" | "DEVELOPER";
export type MembershipStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";

export interface ProjectMember {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  status: MembershipStatus;
  joinedAt: string;
}

export interface AdminUserRecord {
  membershipId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    status: string;
    createdAt: string;
  };
  project: {
    _id: string;
    name: string;
    slug: string;
    status: string;
  };
  role: ProjectRole;
  status: MembershipStatus;
  joinedAt: string;
}
