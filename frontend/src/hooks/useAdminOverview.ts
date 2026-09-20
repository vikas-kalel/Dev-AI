import { useQuery } from "@tanstack/react-query";
import { organizationService } from "../services/organizationService.js";

export function useAdminOverview(organizationId: string | null) {
  return useQuery({
    queryKey: ["admin", "overview", organizationId],
    queryFn: () =>
      organizationId
        ? organizationService.getOverview(organizationId)
        : Promise.reject("No orgId"),
    enabled: !!organizationId,
  });
}

export function useAdminUsers(
  organizationId: string | null,
  filters: {
    projectId?: string;
    role?: string;
    status?: string;
    search?: string;
  } = {},
) {
  return useQuery({
    queryKey: ["admin", "users", organizationId, filters],
    queryFn: () =>
      organizationId
        ? organizationService.getUsers(organizationId, filters)
        : Promise.resolve({ success: true, users: [] }),
    enabled: !!organizationId,
  });
}
