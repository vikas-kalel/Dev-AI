import { Types } from "mongoose";
import {
  KnowledgeSourceModel,
  KnowledgeSourceType,
  KnowledgeSourceStatus,
} from "../models/KnowledgeSource.js";
import { ProjectModel } from "../models/Project.js";
import { encryptSecret } from "../config/security.js";
import { auditService } from "./auditService.js";
import { AppError } from "../middleware/errorHandler.js";

export class SourceService {
  async listSources(projectId: string): Promise<any[]> {
    const sources = await KnowledgeSourceModel.find({
      projectId: new Types.ObjectId(projectId),
    })
      .sort({ createdAt: -1 })
      .lean();

    // Redact configEncrypted from response
    return sources.map((s) => ({
      _id: s._id,
      projectId: s.projectId,
      type: s.type,
      name: s.name,
      status: s.status,
      metadata: s.metadata,
      lastSyncedAt: s.lastSyncedAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async createSource(
    projectId: string,
    type: KnowledgeSourceType,
    name: string,
    config: Record<string, any>,
    userId: string,
  ): Promise<any> {
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new AppError("NOT_FOUND", "Project not found.", 404);
    }

    // Encrypt sensitive secrets in config (such as token or apiKey)
    const sensitiveJson = JSON.stringify({
      token: config.token || config.apiKey || "",
      url: config.url || "",
      username: config.username || "",
    });
    const configEncrypted = encryptSecret(sensitiveJson);

    // Public metadata (safe to show in UI, like repo name, Jira domain, etc.)
    const metadata: Record<string, unknown> = {
      url: config.url || "",
      repo: config.repo || "",
      projectKey: config.projectKey || "",
      spaceKey: config.spaceKey || "",
      syncSchedule: config.syncSchedule || "Manual",
    };

    const source = await KnowledgeSourceModel.create({
      organizationId: project.organizationId,
      projectId: project._id,
      type,
      name: name.trim(),
      status: "CONNECTED",
      configEncrypted,
      metadata,
      lastSyncedAt: new Date(),
      createdBy: new Types.ObjectId(userId),
    });

    await auditService.log({
      organizationId: project.organizationId,
      projectId: project._id,
      actorUserId: new Types.ObjectId(userId),
      action: "SOURCE_CONNECTED",
      targetType: "KNOWLEDGE_SOURCE",
      targetId: source._id,
      metadata: { type, name: source.name },
    });

    return {
      _id: source._id,
      projectId: source.projectId,
      type: source.type,
      name: source.name,
      status: source.status,
      metadata: source.metadata,
      lastSyncedAt: source.lastSyncedAt,
      createdAt: source.createdAt,
    };
  }

  async updateSource(
    projectId: string,
    sourceId: string,
    updates: {
      name?: string;
      status?: KnowledgeSourceStatus;
      config?: Record<string, any>;
      metadata?: Record<string, any>;
    },
    userId: string,
  ): Promise<any> {
    const source = await KnowledgeSourceModel.findOne({
      _id: new Types.ObjectId(sourceId),
      projectId: new Types.ObjectId(projectId),
    });

    if (!source) {
      throw new AppError("NOT_FOUND", "Source not found.", 404);
    }

    if (updates.name) source.name = updates.name.trim();
    if (updates.status) source.status = updates.status;
    if (updates.metadata) {
      source.metadata = { ...source.metadata, ...updates.metadata };
    }

    if (updates.config && (updates.config.token || updates.config.apiKey)) {
      const sensitiveJson = JSON.stringify({
        token: updates.config.token || updates.config.apiKey || "",
        url: updates.config.url || "",
        username: updates.config.username || "",
      });
      source.configEncrypted = encryptSecret(sensitiveJson);
    }

    await source.save();

    await auditService.log({
      organizationId: source.organizationId,
      projectId: source.projectId,
      actorUserId: new Types.ObjectId(userId),
      action: "SOURCE_UPDATED",
      targetType: "KNOWLEDGE_SOURCE",
      targetId: source._id,
      metadata: { name: source.name, status: source.status },
    });

    return {
      _id: source._id,
      projectId: source.projectId,
      type: source.type,
      name: source.name,
      status: source.status,
      metadata: source.metadata,
      lastSyncedAt: source.lastSyncedAt,
      updatedAt: source.updatedAt,
    };
  }

  async disconnectSource(
    projectId: string,
    sourceId: string,
    userId: string,
  ): Promise<void> {
    const source = await KnowledgeSourceModel.findOne({
      _id: new Types.ObjectId(sourceId),
      projectId: new Types.ObjectId(projectId),
    });

    if (!source) {
      throw new AppError("NOT_FOUND", "Source not found.", 404);
    }

    source.status = "DISCONNECTED";
    await source.save();

    await auditService.log({
      organizationId: source.organizationId,
      projectId: source.projectId,
      actorUserId: new Types.ObjectId(userId),
      action: "SOURCE_DISCONNECTED",
      targetType: "KNOWLEDGE_SOURCE",
      targetId: source._id,
      metadata: { name: source.name, type: source.type },
    });
  }
}

export const sourceService = new SourceService();
