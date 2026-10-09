import { request } from "./api.js";
import { KnowledgeSource, KnowledgeSourceType } from "../types/source.js";

export const sourceService = {
  async listSources(
    projectId: string,
  ): Promise<{ success: boolean; sources: KnowledgeSource[] }> {
    return request<{ success: boolean; sources: KnowledgeSource[] }>(
      `/projects/${projectId}/sources`,
      {
        method: "GET",
      },
    );
  },

  async createSource(
    projectId: string,
    type: KnowledgeSourceType,
    name: string,
    config: Record<string, any>,
  ): Promise<{ success: boolean; source: KnowledgeSource }> {
    return request<{ success: boolean; source: KnowledgeSource }>(
      `/projects/${projectId}/sources`,
      {
        method: "POST",
        body: JSON.stringify({ type, name, config }),
      },
    );
  },

  async updateSource(
    projectId: string,
    sourceId: string,
    updates: {
      name?: string;
      config?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ): Promise<{ success: boolean; source: KnowledgeSource }> {
    return request<{ success: boolean; source: KnowledgeSource }>(
      `/projects/${projectId}/sources/${sourceId}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
    );
  },

  async disconnectSource(
    projectId: string,
    sourceId: string,
  ): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(
      `/projects/${projectId}/sources/${sourceId}`,
      {
        method: "DELETE",
      },
    );
  },
};
