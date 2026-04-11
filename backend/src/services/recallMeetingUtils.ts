import type {
  RecallBot,
  RecallTranscriptDownloadItem,
} from "./recallClient.js";

export type RecallBotStatus = {
  code: string | null;
  subCode: string | null;
};

export type TranscriptInsertRow = {
  meetingId: string;
  botId: string;
  speaker: string | null;
  speakerId: string | null;
  transcriptText: string;
  startTranscriptTime: Date;
  endTranscriptTime: Date;
};

export function normalizeBotStatus(
  status: string | null | undefined,
): string | null {
  if (!status) return null;

  switch (status) {
    case "bot.joining_call":
    case "joining_call":
      return "joining";
    case "bot.in_call_recording":
    case "in_call_recording":
      return "joined";
    case "bot.in_call_not_recording":
    case "in_call_not_recording":
      return "waiting";
    case "bot.call_ended":
    case "call_ended":
      return "left";
    case "bot.done":
    case "done":
      return "completed";
    case "bot.fatal":
    case "fatal":
      return "failed";
    default:
      return status;
  }
}

export function extractBotStatus(bot: RecallBot): RecallBotStatus {
  const raw = bot.status;
  if (typeof raw === "string") {
    return {
      code: normalizeBotStatus(raw),
      subCode: bot.status_sub_code ?? null,
    };
  }

  return {
    code: normalizeBotStatus(raw?.code ?? null),
    subCode: raw?.sub_code ?? bot.status_sub_code ?? null,
  };
}

export function pickTranscriptDownloadUrl(bot: RecallBot): string | null {
  const recordings = bot.recordings ?? [];
  for (let i = recordings.length - 1; i >= 0; i -= 1) {
    const url = recordings[i]?.media_shortcuts?.transcript?.data?.download_url;
    if (typeof url === "string" && url.length > 0) {
      return url;
    }
  }
  return null;
}

function appendToken(existing: string, token: string): string {
  if (!existing) return token;
  if (/^[,.;:!?%\]\)}]+$/.test(token)) return `${existing}${token}`;
  if (/^['-]/.test(token)) return `${existing}${token}`;
  if (/[\[\({#$/"-]$/.test(existing)) {
    return `${existing}${token}`;
  }
  return `${existing} ${token}`;
}

export function buildTranscriptRows(
  transcript: RecallTranscriptDownloadItem[],
  meetingId: string,
  botId: string,
): TranscriptInsertRow[] {
  const rows: TranscriptInsertRow[] = [];
  const maxGapMs = 1500;

  let current: TranscriptInsertRow | null = null;

  const finalizeCurrent = () => {
    if (!current) return;
    const text = current.transcriptText.trim();
    if (!text) {
      current = null;
      return;
    }

    rows.push({
      ...current,
      transcriptText: text,
    });
    current = null;
  };

  for (const segment of transcript) {
    const speaker = segment.participant?.name ?? null;
    const speakerId =
      segment.participant?.id === undefined || segment.participant?.id === null
        ? null
        : String(segment.participant.id);

    for (const word of segment.words ?? []) {
      const token = word.text?.trim();
      const start = word.start_timestamp?.absolute;
      const end = word.end_timestamp?.absolute;
      if (!token || !start || !end) continue;

      const startDate = new Date(start);
      const endDate = new Date(end);
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime())
      ) {
        continue;
      }

      if (!current) {
        current = {
          meetingId,
          botId,
          speaker,
          speakerId,
          transcriptText: token,
          startTranscriptTime: startDate,
          endTranscriptTime: endDate,
        };
        continue;
      }

      const speakerChanged =
        current.speaker !== speaker || current.speakerId !== speakerId;
      const gapMs = startDate.getTime() - current.endTranscriptTime.getTime();
      const sentenceEnded = /[.!?]["']?$/.test(current.transcriptText);
      const likelyNewSentence = /^[A-Z]/.test(token);
      const sentenceBoundary = sentenceEnded && likelyNewSentence;

      if (speakerChanged || gapMs > maxGapMs || sentenceBoundary) {
        finalizeCurrent();
        current = {
          meetingId,
          botId,
          speaker,
          speakerId,
          transcriptText: token,
          startTranscriptTime: startDate,
          endTranscriptTime: endDate,
        };
        continue;
      }

      current.transcriptText = appendToken(current.transcriptText, token);
      current.endTranscriptTime = endDate;
    }
  }

  finalizeCurrent();
  return rows;
}
