export type UserStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "DELETED";

export interface User {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
  sessionId?: string;
  message?: string;
  verificationToken?: string;
}

export interface MeResponse {
  success: boolean;
  user: User;
  organizations: Array<{
    _id: string;
    organizationId: {
      _id: string;
      name: string;
      slug: string;
      status: string;
    };
    role: "ADMIN" | "MEMBER";
    status: string;
  }>;
  projects: Array<{
    _id: string;
    projectId: {
      _id: string;
      name: string;
      slug: string;
      description?: string;
      status: string;
      organizationId: string;
    };
    role: "MAINTAINER" | "DEVELOPER";
    status: string;
  }>;
}
