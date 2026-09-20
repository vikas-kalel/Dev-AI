import { request } from "./api.js";
import { Organization, AdminOverview } from "../types/organization.js";
import { AdminUserRecord } from "../types/member.js";

export const organizationService = {
  async createOrganization(
    name: string,
    slug: string,
  ): Promise<{ success: boolean; organization: Organization }> {
    return request<{ success: boolean; organization: Organization }>(
      "/organizations",
      {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      },
    );
  },

  async getOrganization(
    organizationId: string,
  ): Promise<{ success: boolean; organization: Organization }> {
    return request<{ success: boolean; organization: Organization }>(
      `/organizations/${organizationId}`,
      {
        method: "GET",
      },
    );
  },

  async getOverview(
    organizationId: string,
  ): Promise<{ success: boolean; overview: AdminOverview }> {
    return request<{ success: boolean; overview: AdminOverview }>(
      `/organizations/${organizationId}/overview`,
      {
        method: "GET",
      },
    );
  },

  async getUsers(
    organizationId: string,
    filters: {
      projectId?: string;
      role?: string;
      status?: string;
      search?: string;
    } = {},
  ): Promise<{ success: boolean; users: AdminUserRecord[] }> {
    const params = new URLSearchParams();
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    const qs = params.toString() ? `?${params.toString()}` : "";
    return request<{ success: boolean; users: AdminUserRecord[] }>(
      `/organizations/${organizationId}/users${qs}`,
      {
        method: "GET",
      },
    );
  },
};
