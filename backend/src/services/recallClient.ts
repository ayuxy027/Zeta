import axios from "axios";

const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_BASE_URL = process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai";

if (!RECALL_API_KEY) {
  console.warn("RECALL_API_KEY is not set. Recall.ai features will be disabled.");
}

const recallClient = axios.create({
  baseURL: RECALL_BASE_URL,
  headers: {
    Authorization: `ApiKey ${RECALL_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecallCalendarIntegration {
  id: string;
  calendar: {
    email: string;
    kind: string;
    id: string;
  };
}

export interface RecallBot {
  id: string;
  meeting_url: string;
  status: string;
  status_sub_code?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  transcript?: boolean;
}

export interface RecallMeetingEvent {
  id: string;
  title: string;
  meeting_url: string;
  start_time: string;
  end_time: string;
  attendees: Array<{ email: string; is_organizer: boolean; response_status: string }>;
}

// ── Calendar Integration ───────────────────────────────────────────────────

export async function createRecallCalendarIntegration(
  refreshToken: string,
  userEmail: string
): Promise<RecallCalendarIntegration> {
  const response = await recallClient.post("/api/calendar-integrations/", {
    type: "google",
    refresh_token: refreshToken,
    email: userEmail,
  });
  return response.data;
}

export async function deleteRecallCalendarIntegration(calendarId: string): Promise<void> {
  await recallClient.delete(`/api/calendar-integrations/${calendarId}/`);
}

// ── Bot Scheduling ─────────────────────────────────────────────────────────

export async function scheduleRecallBot(
  meetingUrl: string,
  scheduledStartTime: string,
  scheduledEndTime: string
): Promise<RecallBot> {
  const response = await recallClient.post("/api/bots/", {
    meeting_url: meetingUrl,
    scheduled_start_time: scheduledStartTime,
    scheduled_end_time: scheduledEndTime,
    transcript: true,
    realtime_transcription: true,
  });
  return response.data;
}

export async function cancelRecallBot(botId: string): Promise<void> {
  await recallClient.post(`/api/bots/${botId}/cancel/`);
}

export async function getRecallBotStatus(botId: string): Promise<RecallBot> {
  const response = await recallClient.get(`/api/bots/${botId}/`);
  return response.data;
}

// ── Webhook Validation ─────────────────────────────────────────────────────

export function verifyRecallWebhookSignature(
  signature: string | undefined,
  body: string
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret || process.env.NODE_ENV === "development") {
    return true; // Skip in dev or if not configured
  }

  return signature === secret;
}
