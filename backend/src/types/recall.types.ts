// ── Recall Webhook Payload Types ─────────────────────────────────────────────

export interface RecallCalendarSyncPayload {
  type: "calendar.sync_events";
  calendar_id: string;
  events?: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; timeZone?: string };
    end?: { dateTime?: string; timeZone?: string };
    conferenceData?: {
      entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
    attendees?: Array<{
      email: string;
      organizer?: boolean;
      responseStatus?: string;
    }>;
  }>;
  last_updated_ts?: number;
}

export interface RecallBotEventPayload {
  type: "bot.call_ended" | "bot.in_call_recording" | "bot.in_call_not_recording" | "bot.joining_call" | "bot.done" | "bot.fatal";
  bot_id: string;
  meeting_url?: string;
  status?: string;
  status_sub_code?: string;
  sub_code?: string;
  start_time?: string;
  end_time?: string;
}

export interface RecallTranscriptPayload {
  type: "transcript";
  bot_id: string;
  transcript: Array<{
    speaker: string;
    speaker_id: string;
    text: string;
    start_time: string;
    end_time: string;
  }>;
}

// ── Bot Status Mapping ───────────────────────────────────────────────────────

export function mapBotStatus(eventType: string): string {
  switch (eventType) {
    case "bot.joining_call":
      return "joining";
    case "bot.in_call_recording":
      return "joined";
    case "bot.in_call_not_recording":
      return "waiting";
    case "bot.call_ended":
      return "left";
    case "bot.done":
      return "completed";
    case "bot.fatal":
      return "failed";
    default:
      return eventType;
  }
}

// ── Meeting Platform Detection ───────────────────────────────────────────────

export function detectMeetingPlatform(url: string | null): string | null {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("meet.google.com")) return "google_meet";
  if (lowerUrl.includes("zoom.us")) return "zoom";
  if (lowerUrl.includes("teams.microsoft.com")) return "microsoft_teams";
  if (lowerUrl.includes("webex.com")) return "webex";
  return "other";
}
