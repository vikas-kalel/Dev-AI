import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { attachmentService } from "../services/attachmentService.js";

// Memory storage for multer so AttachmentService can validate size & extension before writing
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function uploadAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId;
    if (!req.file) {
      res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "No file was uploaded." },
        });
      return;
    }

    const attachment = await attachmentService.saveAttachment(
      conversationId,
      req.userId!,
      req.file,
    );
    res.status(201).json({
      success: true,
      attachment: {
        id: attachment._id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        processingStatus: attachment.processingStatus,
        createdAt: attachment.createdAt,
      },
      message: "File uploaded and attached to conversation.",
    });
  } catch (err) {
    next(err);
  }
}

export async function removeAttachment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { attachmentId } = req.params;
    await attachmentService.removeAttachment(attachmentId, req.userId!);
    res.status(200).json({ success: true, message: "Attachment removed." });
  } catch (err) {
    next(err);
  }
}
