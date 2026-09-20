import { request } from "./api.js";
import { Project } from "../types/project.js";

export const projectService = {
  async listProjects(
    organizationId: string,
  ): Promise<{ success: boolean; projects: Project[] }> {
    return request<{ success: boolean; projects: Project[] }>(
      `/organizations/${organizationId}/projects`,
      {
        method: "GET",
      },
    );
  },

  async createProject(
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
  ): Promise<{ success: boolean; project: Project }> {
    return request<{ success: boolean; project: Project }>(
      `/organizations/${organizationId}/projects`,
      {
        method: "POST",
        body: JSON.stringify({ name, slug, description }),
      },
    );
  },

  async getProject(
    projectId: string,
  ): Promise<{ success: boolean; project: Project }> {
    return request<{ success: boolean; project: Project }>(
      `/projects/${projectId}`,
      {
        method: "GET",
      },
    );
  },

  async archiveProject(
    projectId: string,
  ): Promise<{ success: boolean; project: Project }> {
    return request<{ success: boolean; project: Project }>(
      `/projects/${projectId}/archive`,
      {
        method: "POST",
      },
    );
  },
};
