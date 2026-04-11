import type { PipelinePayload } from "../pipeline/types.js";
import { runPipeline } from "../pipeline/pipeline.js";
import { prisma } from "../lib/prisma.js";
import type { RecallTranscriptDownloadItem } from "./recallClient.js";
import { buildTranscriptRows } from "./recallMeetingUtils.js";

export async function saveMeetingTranscript(params: {
  meetingId: string;
  botId: string;
  transcript: RecallTranscriptDownloadItem[];
  replaceExisting: boolean;
}): Promise<{ inserted: number }> {
  const { meetingId, botId, transcript, replaceExisting } = params;
  const rows = buildTranscriptRows(transcript, meetingId, botId);

  if (rows.length === 0) {
    return { inserted: 0 };
  }

  if (replaceExisting) {
    await prisma.$transaction([
      prisma.transcript.deleteMany({ where: { meetingId } }),
      prisma.transcript.createMany({ data: rows }),
    ]);
  } else {
    await prisma.transcript.createMany({ data: rows });
  }

  const transcriptText = rows
    .map((r) => `${r.speaker ? `${r.speaker}: ` : ""}${r.transcriptText}`)
    .join("\n");

  if (transcriptText.trim()) {
    const payload: PipelinePayload = {
      source_id: `meeting_${meetingId}`,
      source_type: "meeting",
      raw_text: transcriptText,
      metadata: {
        author: botId,
        timestamp: new Date().toISOString(),
        subject: `Recall meeting ${meetingId}`,
      },
    };

    try {
      await runPipeline(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[Recall] Pipeline failed after transcript save:", message);
    }
  }

  return { inserted: rows.length };
}
