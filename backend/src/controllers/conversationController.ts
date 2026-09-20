import type { Request, Response, NextFunction } from "express";
import { conversationService } from "../services/conversationService.js";

export async function createConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const { title } = req.body;
    const conversation = await conversationService.createConversation(
      projectId,
      req.userId!,
      title,
    );
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.projectId;
    const conversations = await conversationService.listConversations(
      projectId,
      req.userId!,
    );
    res.status(200).json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await conversationService.getConversation(
      conversationId,
      req.userId!,
    );
    res.status(200).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId;
    const { content } = req.body;
    if (!content || !content.trim()) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Message content is required.",
          },
        });
      return;
    }

    const { userMessage, assistantMessage } =
      await conversationService.sendMessage(
        conversationId,
        req.userId!,
        content,
      );

    res.status(200).json({
      success: true,
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    next(err);
  }
}

export async function archiveConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId;
    await conversationService.archiveConversation(conversationId, req.userId!);
    res.status(200).json({ success: true, message: "Conversation archived." });
  } catch (err) {
    next(err);
  }
}
