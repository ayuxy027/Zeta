import express, { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyRecallWebhookSignature } from "../services/recallClient.js";
import { mapBotStatus } from "../types/recall.types.js";

const router = express.Router();

// ── Middleware: Validate Recall Webhook ──────────────────────────────────────

function validateRecallWebhook(req: Request, res: Response, next: () => void) {
  const signature = req.headers["x-recall-signature"] as string | undefined;
  const body = JSON.stringify(req.body);

  if (!verifyRecallWebhookSignature(signature, body)) {
    console.warn("[Recall Webhook] Invalid signature");
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  next();
}

// ── POST /webhooks/recall ────────────────────────────────────────────────────
// Single endpoint for all Recall.ai events

router.post("/", validateRecallWebhook, async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    // Route based on payload type
    switch (payload.type) {
      // ── Calendar Events ──────────────────────────────────────────────────
      case "calendar.sync_events":
        console.log(
          `[Recall Webhook] Calendar sync: ${payload.events?.length ?? 0} events for calendar ${payload.calendar_id}`
        );
        // Recall.ai auto-schedules bots for calendar events — no action needed
        break;

      // ── Bot State Changes ────────────────────────────────────────────────
      case "bot.call_ended":
      case "bot.in_call_recording":
      case "bot.in_call_not_recording":
      case "bot.joining_call":
      case "bot.done":
      case "bot.fatal": {
        const status = mapBotStatus(payload.type);
        const subCode = payload.status_sub_code ?? payload.sub_code ?? null;

        console.log(`[Recall Webhook] Bot ${payload.bot_id} → ${status}`);

        await prisma.meeting.updateMany({
          where: { botId: payload.bot_id },
          data: {
            botStatus: status,
            botStatusSubCode: subCode,
          },
        });
        break;
      }

      // ── Transcription Chunks ─────────────────────────────────────────────
      case "transcript": {
        const chunks = payload.transcript ?? [];
        console.log(
          `[Recall Webhook] Transcript: ${chunks.length} chunks for bot ${payload.bot_id}`
        );

        // Find meeting by botId
        const meeting = await prisma.meeting.findFirst({
          where: { botId: payload.bot_id },
          select: { id: true },
        });

        if (!meeting) {
          console.warn(`[Recall Webhook] No meeting found for bot ${payload.bot_id}`);
          return res.status(404).json({ error: "Meeting not found" });
        }

        // Insert transcript chunks (batch insert for performance)
        await prisma.transcript.createMany({
          data: chunks.map((chunk: { speaker: string; speaker_id: string; text: string; start_time: string; end_time: string }) => ({
            meetingId: meeting.id,
            botId: payload.bot_id,
            speaker: chunk.speaker || null,
            speakerId: chunk.speaker_id || null,
            transcriptText: chunk.text,
            startTranscriptTime: new Date(chunk.start_time),
            endTranscriptTime: new Date(chunk.end_time),
            createdAt: new Date(),
          })),
          skipDuplicates: true,
        });

        break;
      }

      // ── Unknown Event ────────────────────────────────────────────────────
      default:
        console.log(`[Recall Webhook] Unhandled event type: ${payload.type}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[Recall Webhook] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
