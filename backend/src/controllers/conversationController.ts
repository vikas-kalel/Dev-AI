import type { Request, Response, NextFunction } from "express";
import { conversationService } from "../services/conversationService.js";
import { AppError } from "../middleware/errorHandler.js";

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
      res.status(400).json({
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

// ── SSE Streaming endpoint ────────────────────────────────────────────────────
// POST /conversations/:conversationId/messages/stream
//
// SSE event schema:
//   {type:"start",  userMessageId, assistantMessageId}  — DB rows reserved
//   {type:"chunk",  text}                               — Gemini token chunk
//   {type:"done",   assistantMessageId, tokens, durationMs, model} — success
//   {type:"error",  error, partial, partialText?}       — failure
// ─────────────────────────────────────────────────────────────────────────────
export async function streamMessage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const { content } = req.body;
  const conversationId = req.params.conversationId;

  // Validate BEFORE flushing SSE headers so errors surface as normal HTTP 4xx
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Message content is required.",
      },
    });
    return;
  }

  // ── Open SSE connection ────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering if present
  res.flushHeaders?.();

  let aborted = false;
  const isAborted = () => aborted;

  const onClose = () => {
    aborted = true;
  };
  res.on("close", onClose);
  req.on("aborted", onClose);

  const writeEvent = (payload: Record<string, unknown>) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  // Track what has been accumulated so we can echo it back in error events
  let partialText = "";

  try {
    await conversationService.streamMessage(
      conversationId,
      req.userId!,
      content.trim(),
      {
        onStart: (userMessageId, assistantMessageId) => {
          writeEvent({ type: "start", userMessageId, assistantMessageId });
        },

        onChunk: (text) => {
          if (!aborted) {
            partialText += text;
            writeEvent({ type: "chunk", text });
          }
        },

        isAborted,
      },
    );

    // streamMessage resolves only after the DB write succeeds
    // Re-fetch the updated assistant message to get the persisted IDs/tokens
    writeEvent({
      type: "done",
      conversationId,
    });
  } catch (err) {
    const isAppError = err instanceof AppError;
    const errMsg = err instanceof Error ? err.message : "Stream failed.";
    const isPartial = partialText.length > 0;

    // If headers not yet flushed (AppError thrown before service started),
    // surface as plain JSON. Otherwise send SSE error event.
    if (isAppError && !res.headersSent) {
      res.status((err as AppError).statusCode ?? 500).json({
        error: { code: (err as AppError).code, message: errMsg },
      });
      return;
    }

    writeEvent({
      type: "error",
      error: errMsg,
      partial: isPartial,
      ...(isPartial ? { partialText } : {}),
    });
  } finally {
    res.removeListener("close", onClose);
    req.removeListener("aborted", onClose);
    if (!res.writableEnded) res.end();
  }
}
