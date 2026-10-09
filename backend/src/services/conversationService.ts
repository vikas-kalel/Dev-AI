import { Types } from "mongoose";
import { ConversationModel, IConversation } from "../models/Conversation.js";
import { MessageModel, IMessage } from "../models/Message.js";
import { ConversationAttachmentModel } from "../models/ConversationAttachment.js";
import { ProjectModel } from "../models/Project.js";
import { aiProvider } from "./ai/index.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../config/logger.js";

export class ConversationService {
  async createConversation(
    projectId: string,
    userId: string,
    title?: string,
  ): Promise<IConversation> {
    const project = await ProjectModel.findById(projectId);
    if (!project || project.status === "ARCHIVED") {
      throw new AppError(
        "BAD_REQUEST",
        "Cannot create conversations in an archived or non-existent project.",
        400,
      );
    }

    const conversation = await ConversationModel.create({
      organizationId: project.organizationId,
      projectId: project._id,
      userId: new Types.ObjectId(userId),
      title: title?.trim() || "New Conversation",
      status: "ACTIVE",
    });

    return conversation;
  }

  async listConversations(
    projectId: string,
    userId: string,
  ): Promise<IConversation[]> {
    return ConversationModel.find({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      status: "ACTIVE",
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getConversation(conversationId: string, userId: string): Promise<any> {
    const conversation =
      await ConversationModel.findById(conversationId).lean();
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    }

    // Verify ownership
    if (conversation.userId.toString() !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have access to this conversation.",
        403,
      );
    }

    // Load messages
    const messages = await MessageModel.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    // Load active attachments
    const attachments = await ConversationAttachmentModel.find({
      conversationId: conversation._id,
      processingStatus: { $ne: "FAILED" },
    }).lean();

    return {
      ...conversation,
      messages,
      attachments,
    };
  }

  async archiveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await ConversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    }

    conversation.status = "ARCHIVED";
    await conversation.save();
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
  ): Promise<{ userMessage: IMessage; assistantMessage: IMessage }> {
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    }

    if (conversation.userId.toString() !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have access to this conversation.",
        403,
      );
    }

    const project = await ProjectModel.findById(conversation.projectId);
    if (!project || project.status === "ARCHIVED") {
      throw new AppError(
        "BAD_REQUEST",
        "Cannot send messages in an archived project.",
        400,
      );
    }

    // 1. Save USER message
    const userMessage = await MessageModel.create({
      organizationId: conversation.organizationId,
      projectId: conversation.projectId,
      conversationId: conversation._id,
      role: "USER",
      content: content.trim(),
    });

    // If first message, update conversation title
    const messageCount = await MessageModel.countDocuments({
      conversationId: conversation._id,
    });
    if (messageCount <= 1 || conversation.title === "New Conversation") {
      const generatedTitle = content.trim().slice(0, 36);
      conversation.title = generatedTitle;
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    // 2. Fetch recent conversation history
    const historyDocs = await MessageModel.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(12)
      .lean();

    const history = historyDocs.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    // 3. Fetch active attachments
    const attachments = await ConversationAttachmentModel.find({
      conversationId: conversation._id,
      processingStatus: "READY",
    }).lean();

    const attachmentSummaries = attachments.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
    }));

    // 4. Generate AI response via AIProvider
    logger.debug("[ConversationService] Sending message to AI provider", {
      conversationId,
      projectId: conversation.projectId,
      promptLength: content.trim().length,
      historyLength: history.length,
      attachments: attachmentSummaries.length,
    });

    const aiResult = await aiProvider.generateResponse({
      prompt: content.trim(),
      projectName: project.name,
      projectDescription: project.description,
      history,
      attachmentSummaries,
    });

    logger.debug("[ConversationService] AI response received", {
      conversationId,
      model: aiResult.model,
      outputTokens: aiResult.outputTokens,
    });

    // 5. Save ASSISTANT message
    const assistantMessage = await MessageModel.create({
      organizationId: conversation.organizationId,
      projectId: conversation.projectId,
      conversationId: conversation._id,
      role: "ASSISTANT",
      content: aiResult.content,
      model: aiResult.model,
      inputTokens: aiResult.inputTokens || 0,
      outputTokens: aiResult.outputTokens || 0,
    });

    return { userMessage, assistantMessage };
  }

  // ── Streaming variant ──────────────────────────────────────────────────────
  // Uses the "reserve-then-fill" pattern:
  //   1. Save user message immediately
  //   2. Reserve an ASSISTANT row with status=STREAMING (visible in history)
  //   3. Stream Gemini chunks to the client via onChunk
  //   4. On completion → update row to DONE with full text
  //   5. On any failure → update row to PARTIAL or FAILED with whatever arrived
  // ──────────────────────────────────────────────────────────────────────────
  async streamMessage(
    conversationId: string,
    userId: string,
    content: string,
    callbacks: {
      onStart: (userMessageId: string, assistantMessageId: string) => void;
      onChunk: (text: string) => void;
      isAborted: () => boolean;
    },
  ): Promise<void> {
    // ── Validate conversation + project ─────────────────────────────────────
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      throw new AppError("NOT_FOUND", "Conversation not found.", 404);
    }
    if (conversation.userId.toString() !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "You do not have access to this conversation.",
        403,
      );
    }
    const project = await ProjectModel.findById(conversation.projectId);
    if (!project || project.status === "ARCHIVED") {
      throw new AppError(
        "BAD_REQUEST",
        "Cannot send messages in an archived project.",
        400,
      );
    }

    // ── 1. Save USER message ─────────────────────────────────────────────────
    const userMessage = await MessageModel.create({
      organizationId: conversation.organizationId,
      projectId: conversation.projectId,
      conversationId: conversation._id,
      role: "USER",
      content: content.trim(),
      status: "DONE",
    });

    // Update title on first turn
    const messageCount = await MessageModel.countDocuments({
      conversationId: conversation._id,
    });
    if (messageCount <= 1 || conversation.title === "New Conversation") {
      conversation.title = content.trim().slice(0, 36);
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    // ── 2. Reserve ASSISTANT placeholder ────────────────────────────────────
    const assistantPlaceholder = await MessageModel.create({
      organizationId: conversation.organizationId,
      projectId: conversation.projectId,
      conversationId: conversation._id,
      role: "ASSISTANT",
      content: "",
      status: "STREAMING",
    });
    const assistantMessageId = assistantPlaceholder._id.toString();

    // Notify controller: both IDs are ready, SSE "start" can be sent
    callbacks.onStart(userMessage._id.toString(), assistantMessageId);

    // ── 3. Build history & attachments (exclude the empty placeholder) ───────
    const historyDocs = await MessageModel.find({
      conversationId: conversation._id,
      _id: { $ne: assistantPlaceholder._id },
    })
      .sort({ createdAt: 1 })
      .limit(12)
      .lean();

    const history = historyDocs.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const attachments = await ConversationAttachmentModel.find({
      conversationId: conversation._id,
      processingStatus: "READY",
    }).lean();
    const attachmentSummaries = attachments.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
    }));

    // ── 4. Stream from AI provider ───────────────────────────────────────────
    let accumulatedText = "";
    let streamResult: {
      totalText: string;
      model: string;
      tokens: number;
      durationMs: number;
    } | null = null;

    try {
      logger.debug("[ConversationService] Starting AI stream", {
        conversationId,
        assistantMessageId,
        historyLength: history.length,
      });

      streamResult = await aiProvider.streamResponse(
        {
          prompt: content.trim(),
          projectName: project.name,
          projectDescription: project.description,
          history,
          attachmentSummaries,
        },
        (chunk) => {
          accumulatedText += chunk;
          callbacks.onChunk(chunk);
        },
        callbacks.isAborted,
      );

      // ── 4a. Happy path — update to DONE ───────────────────────────────────
      const finalText = streamResult.totalText || accumulatedText;
      await MessageModel.findByIdAndUpdate(assistantMessageId, {
        content: finalText,
        status: "DONE",
        model: streamResult.model,
        outputTokens: streamResult.tokens,
      });
      conversation.updatedAt = new Date();
      await conversation.save();

      logger.debug("[ConversationService] Stream completed", {
        conversationId,
        assistantMessageId,
        model: streamResult.model,
        tokens: streamResult.tokens,
        durationMs: streamResult.durationMs,
      });
    } catch (err) {
      // ── 4b. Failure path — save whatever arrived ───────────────────────────
      const isPartial = accumulatedText.length > 0;
      const savedContent = isPartial
        ? accumulatedText + "\n\n*[Response interrupted due to an error.]*"
        : "[AI response failed. Please try again.]";
      const savedStatus = isPartial ? "PARTIAL" : "FAILED";

      logger.error(
        "[ConversationService] Stream error — saving partial/failed message",
        {
          conversationId,
          assistantMessageId,
          isPartial,
          accumulatedLength: accumulatedText.length,
          error: err instanceof Error ? err.message : String(err),
        },
      );

      // Best-effort DB update — if this also fails we've already logged
      try {
        await MessageModel.findByIdAndUpdate(assistantMessageId, {
          content: savedContent,
          status: savedStatus,
        });
      } catch (dbErr) {
        logger.error(
          "[ConversationService] CRITICAL — failed to persist error state for assistant message",
          {
            conversationId,
            assistantMessageId,
            savedContent,
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
          },
        );
      }

      throw err; // re-throw so the controller can send the SSE error event
    }
  }
}

export const conversationService = new ConversationService();
