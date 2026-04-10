import type { Request, Response } from "express";
import { groqService } from "../services/groqService.js";
import {
  checkRateLimit,
  incrementRateLimit,
  getUserId,
} from "../middleware/rateLimiter.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import type {
  GroqRequest,
  GroqStreamRequest,
  DraftGenerationRequest,
  ApiResponse,
} from "../types/index.js";

export const chat = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { messages, model, userId } = req.body as GroqRequest;

    if (!groqService.isConfigured()) {
      res.status(500).json({
        success: false,
        error: "Groq API not configured",
      } as ApiResponse);
      return;
    }

    const userIdentifier = userId || getUserId(req);
    const rateLimit = checkRateLimit(userIdentifier, "groq_chat");

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      } as ApiResponse);
      return;
    }

    const result = await groqService.chat({ messages, model, userId });
    incrementRateLimit(userIdentifier, "groq_chat");

    res.json({
      success: true,
      data: result,
    } as ApiResponse<typeof result>);
  },
);

export const streamChat = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { messages, model, userId } = req.body as GroqStreamRequest;

    if (!groqService.isConfigured()) {
      res.status(500).json({
        success: false,
        error: "Groq API not configured",
      } as ApiResponse);
      return;
    }

    const userIdentifier = userId || getUserId(req);
    const rateLimit = checkRateLimit(userIdentifier, "groq_chat");

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      } as ApiResponse);
      return;
    }

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      await groqService.streamChat(
        { messages, model, userId },
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        },
      );

      res.write("data: [DONE]\n\n");
      res.end();
      incrementRateLimit(userIdentifier, "groq_chat");
    } catch (error) {
      console.error("Groq stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  },
);

export const generateDocument = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { params, userId } = req.body as DraftGenerationRequest;

    if (!groqService.isConfigured()) {
      res.status(500).json({
        success: false,
        error: "Groq API not configured",
      } as ApiResponse);
      return;
    }

    const userIdentifier = userId || getUserId(req);
    const rateLimit = checkRateLimit(userIdentifier, "groq_draft");

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      } as ApiResponse);
      return;
    }

    const result = await groqService.generateDocument(params);
    incrementRateLimit(userIdentifier, "groq_draft");

    res.json({
      success: true,
      data: { content: result },
    } as ApiResponse<{ content: string }>);
  },
);

export const streamDocument = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { params, userId } = req.body as DraftGenerationRequest;

    if (!groqService.isConfigured()) {
      res.status(500).json({
        success: false,
        error: "Groq API not configured",
      } as ApiResponse);
      return;
    }

    const userIdentifier = userId || getUserId(req);
    const rateLimit = checkRateLimit(userIdentifier, "groq_draft");

    if (!rateLimit.allowed) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      } as ApiResponse);
      return;
    }

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      await groqService.streamDocument(
        params,
        (chunk: string, done: boolean) => {
          if (done) {
            res.write("data: [DONE]\n\n");
            res.end();
          } else {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        },
      );

      incrementRateLimit(userIdentifier, "groq_draft");
    } catch (error) {
      console.error("Groq document stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  },
);
