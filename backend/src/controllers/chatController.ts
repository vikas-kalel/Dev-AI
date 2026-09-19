export async function askChat(
  req: any,
  res: any,
  next: any
): Promise<void> {
  try {
    const { prompt, history, model } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({
        success: false,
        error: "A valid 'prompt' string is required.",
      });
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length > 10000) {
      res.status(400).json({
        success: false,
        error: "Prompt exceeds maximum allowed length (10,000 characters).",
      });
      return;
    }

    const { generateChatResponse } = await import("../services/geminiService.js");
    const result = await generateChatResponse({
      prompt: trimmedPrompt,
      history: Array.isArray(history) ? history : [],
      model: typeof model === "string" ? model : undefined,
    });

    res.json({
      success: true,
      answer: result.text,
      model: result.model,
      timestamp: result.timestamp,
      tokens: result.tokens,
      durationMs: result.durationMs,
    });
  } catch (error) {
    next(error);
  }
}

export async function streamChat(
  req: any,
  res: any
): Promise<void> {
  const { prompt, history, model } = req.body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({
      success: false,
      error: "A valid 'prompt' string is required.",
    });
    return;
  }

  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > 10000) {
    res.status(400).json({
      success: false,
      error: "Prompt exceeds maximum allowed length (10,000 characters).",
    });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let clientDisconnected = false;
  const onDisconnect = () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
    }
  };

  res.on("close", onDisconnect);
  req.on("aborted", onDisconnect);

  try {
    const { generateChatStream } = await import("../services/geminiService.js");
    const result = await generateChatStream(
      {
        prompt: trimmedPrompt,
        history: Array.isArray(history) ? history : [],
        model: typeof model === "string" ? model : undefined,
      },
      (chunkText) => {
        if (!clientDisconnected) {
          res.write(`data: ${JSON.stringify({ type: "chunk", text: chunkText })}\n\n`);
        }
      },
      () => clientDisconnected
    );

    if (!clientDisconnected) {
      res.write(
        `data: ${JSON.stringify({
          type: "done",
          totalText: result.totalText,
          tokens: result.tokens,
          durationMs: result.durationMs,
          model: result.model,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
      res.end();
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to generate stream response.";
    console.error("[StreamChat Error]", error);
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`);
      res.end();
    }
  }
}

export async function getHealth(
  _req: any,
  res: any
): Promise<void> {
  const { DEFAULT_MODEL } = await import("../config/gemini.js");
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    service: "AI Assistant API",
    geminiConfigured: hasKey,
    model: DEFAULT_MODEL,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
