import { Types } from "mongoose";
import { AuditLogModel, IAuditLog } from "../models/AuditLog.js";

export interface CreateAuditLogParams {
  organizationId: string | Types.ObjectId;
  projectId?: string | Types.ObjectId;
  actorUserId: string | Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async log(params: CreateAuditLogParams): Promise<IAuditLog> {
    const doc = new AuditLogModel({
      organizationId: new Types.ObjectId(params.organizationId),
      projectId: params.projectId
        ? new Types.ObjectId(params.projectId)
        : undefined,
      actorUserId: new Types.ObjectId(params.actorUserId),
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId
        ? new Types.ObjectId(params.targetId)
        : undefined,
      metadata: params.metadata || {},
    });
    return doc.save();
  }

  async getRecentActivity(
    organizationId: string | Types.ObjectId,
    projectId?: string | Types.ObjectId,
    limit: number = 20,
  ): Promise<any[]> {
    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
    };
    if (projectId) {
      query.projectId = new Types.ObjectId(projectId);
    }

    return AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actorUserId", "name email")
      .lean();
  }
}

export const auditService = new AuditService();
