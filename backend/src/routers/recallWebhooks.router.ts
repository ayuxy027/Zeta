import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { verifyRecallWebhookSignature } from "../services/recallClient.js";
import { mapBotStatus } from "../types/recall.types.js";
import { runPipeline } from "../pipeline/pipeline.js";
import type { PipelinePayload } from "../pipeline/types.js";

const router = express.Router();

function validateRecallWebhook(req: Request, res: Response, next: () => void) {
  const signature = req.headers["x-recall-signature"] as string | undefined;
  const rawBody = (req as unknown as Record<string, unknown>).rawBody as string ?? JSON.stringify(req.body);
  const timestamp = req.headers["x-recall-timestamp"] as string | undefined;

  if (!verifyRecallWebhookSignature(signature, rawBody)) {
    console.warn("[Recall Webhook] Invalid signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  if (timestamp) {
    const parsed = Number.parseInt(timestamp, 10);
    if (Number.isFinite(parsed)) {
      const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - parsed);
      if (ageSeconds > 300) {
        console.warn("[Recall Webhook] Rejected stale webhook payload");
        res.status(401).json({ error: "Stale webhook request" });
        return;
      }
    }
  }

  const payloadType = (req.body as { type?: unknown })?.type;
  if (typeof payloadType !== "string" || payloadType.trim().length === 0) {
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  next();
}

router.post("/", validateRecallWebhook, async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    switch (payload.type) {
      case "calendar.sync_events":
        console.log(`[Recall Webhook] Calendar sync: ${payload.events?.length ?? 0} events`);
        break;

      case "bot.call_ended":
      case "bot.in_call_recording":
      case "bot.in_call_not_recording":
      case "bot.joining_call":
      case "bot.done":
      case "bot.fatal": {
        const status = mapBotStatus(payload.type);
        console.log(`[Recall Webhook] Bot ${payload.bot_id} → ${status}`);
        await prisma.meeting.updateMany({
          where: { botId: payload.bot_id },
          data: { botStatus: status, botStatusSubCode: payload.status_sub_code ?? payload.sub_code ?? null },
        });
        break;
      }

      case "transcript": {
        const chunks = payload.transcript ?? [];
        console.log(`[Recall Webhook] Transcript: ${chunks.length} chunks for bot ${payload.bot_id}`);
        const meeting = await prisma.meeting.findFirst({ where: { botId: payload.bot_id }, select: { id: true } });
        if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }
        const deduped = new Map<string, { speaker: string; speaker_id: string; text: string; start_time: string; end_time: string }>();
        for (const c of chunks as Array<{ speaker: string; speaker_id: string; text: string; start_time: string; end_time: string }>) {
          const key = crypto
            .createHash("sha1")
            .update(`${payload.bot_id}|${c.start_time}|${c.end_time}|${c.speaker_id ?? ""}|${c.text ?? ""}`)
            .digest("hex");
          deduped.set(key, c);
        }
        await prisma.transcript.createMany({
          data: [...deduped.values()].map((c) => ({
            meetingId: meeting.id, botId: payload.bot_id,
            speaker: c.speaker || null, speakerId: c.speaker_id || null,
            transcriptText: c.text,
            startTranscriptTime: new Date(c.start_time), endTranscriptTime: new Date(c.end_time),
          })),
          skipDuplicates: true,
        });

        const transcriptText = [...deduped.values()]
          .map((c) => `${c.speaker ? `${c.speaker}: ` : ""}${c.text ?? ""}`.trim())
          .filter(Boolean)
          .join("\n");

        if (transcriptText.trim()) {
          const pipelinePayload: PipelinePayload = {
            source_id: `meeting_${meeting.id}`,
            source_type: "meeting",
            raw_text: transcriptText,
            metadata: {
              author: payload.bot_id,
              timestamp: new Date().toISOString(),
              subject: `Recall meeting ${meeting.id}`,
            },
          };

          const runWithRetry = async () => {
            try {
              await runPipeline(pipelinePayload);
            } catch (firstErr) {
              const message = firstErr instanceof Error ? firstErr.message : String(firstErr);
              console.warn("[Recall Webhook] Pipeline first attempt failed, retrying:", message);
              await runPipeline(pipelinePayload);
            }
          };

          void runWithRetry().catch((err) => {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[Recall Webhook] Meeting pipeline failed:", message);
          });
        }
        break;
      }

      default:
        console.log(`[Recall Webhook] Unhandled: ${payload.type}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[Recall Webhook] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
