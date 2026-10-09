import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import {
  ConversationAttachmentModel,
  IConversationAttachment,
} from "../models/ConversationAttachment.js";
import { ConversationModel } from "../models/Conversation.js";
import { AppError } from "../middleware/errorHandler.js";
import { ENV } from "../config/env.js";
import { logger } from "../config/logger.js";

const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".py",
  ".csv",
  ".pdf",
  ".yaml",
  ".yml",
  ".sql",
  ".html",
  ".css",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class AttachmentService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), ENV.UPLOAD_DIR);
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveAttachment(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<IConversationAttachment> {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    }

    if (conversation.userId.toString() !== userId) {
      throw new AppError("FORBIDDEN", "You do not own this conversation.", 403);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new AppError(
        "INVALID_FILE_TYPE",
        `Unsupported file type "${ext}". Supported types: text, code, json, yaml, csv, markdown, pdf.`,
        400,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError("FILE_TOO_LARGE", "File exceeds the 10MB limit.", 400);
    }

    // Generate safe storage key
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName}`;
    const targetPath = path.join(this.uploadDir, storageKey);

    // Write file to storage
    await fs.promises.writeFile(targetPath, file.buffer);

    const attachment = await ConversationAttachmentModel.create({
      organizationId: conversation.organizationId,
      projectId: conversation.projectId,
      conversationId: conversation._id,
      uploadedBy: new Types.ObjectId(userId),
      fileName: safeName,
      mimeType: file.mimetype || "application/octet-stream",
      storageKey,
      sizeBytes: file.size,
      processingStatus: "READY",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day retention
    });

    return attachment;
  }

  async removeAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await ConversationAttachmentModel.findById(attachmentId);
    if (!attachment) {
      throw new AppError("NOT_FOUND", "Attachment not found.", 404);
    }

    if (attachment.uploadedBy.toString() !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "You can only delete files you uploaded.",
        403,
      );
    }

    // Delete file from disk if present
    const filePath = path.join(this.uploadDir, attachment.storageKey);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        logger.warn("[AttachmentService] Could not remove physical file", {
          filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await ConversationAttachmentModel.findByIdAndDelete(attachment._id);
  }
}

export const attachmentService = new AttachmentService();
