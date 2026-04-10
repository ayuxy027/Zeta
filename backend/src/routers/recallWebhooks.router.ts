import express, { type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyRecallWebhookSignature } from "../services/recallClient.js";
import { mapBotStatus } from "../types/recall.types.js";

const router = express.Router();

function validateRecallWebhook(req: Request, res: Response, next: () => void) {
  const signature = req.headers["x-recall-signature"] as string | undefined;
  const rawBody = (req as unknown as Record<string, unknown>).rawBody as string ?? JSON.stringify(req.body);

  if (!verifyRecallWebhookSignature(signature, rawBody)) {
    console.warn("[Recall Webhook] Invalid signature");
    res.status(401).json({ error: "Invalid webhook signature" });
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
        await prisma.transcript.createMany({
          data: chunks.map((c: { speaker: string; speaker_id: string; text: string; start_time: string; end_time: string }) => ({
            meetingId: meeting.id, botId: payload.bot_id,
            speaker: c.speaker || null, speakerId: c.speaker_id || null,
            transcriptText: c.text,
            startTranscriptTime: new Date(c.start_time), endTranscriptTime: new Date(c.end_time),
          })),
          skipDuplicates: true,
        });
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
