export interface Organization {
  _id: string;
  name: string;
  slug: string;
  createdBy: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  maintainersCount: number;
  developersCount: number;
  pendingInvitationsCount: number;
}

export interface ProjectBreakdownItem {
  projectId: string;
  name: string;
  slug: string;
  status: string;
  totalMembers: number;
  maintainers: number;
  developers: number;
  pendingInvitations: number;
}

export interface AuditActivityItem {
  _id: string;
  action: string;
  actorUserId?: {
    _id: string;
    name: string;
    email: string;
  };
  targetType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminOverview {
  metrics: AdminMetrics;
  projectBreakdown: ProjectBreakdownItem[];
  recentActivity: AuditActivityItem[];
}
