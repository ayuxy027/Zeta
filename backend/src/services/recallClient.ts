const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_BASE_URL = process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai";

if (!RECALL_API_KEY) {
  console.warn("RECALL_API_KEY is not set. Recall.ai features will be disabled.");
}

const headers = {
  Authorization: `ApiKey ${RECALL_API_KEY}`,
  "Content-Type": "application/json",
};

async function recallFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${RECALL_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
}

export interface RecallCalendarIntegration {
  id: string;
  calendar: { email: string; kind: string; id: string };
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

export async function createRecallCalendarIntegration(
  refreshToken: string,
  userEmail: string,
): Promise<RecallCalendarIntegration> {
  const res = await recallFetch("/api/calendar-integrations/", {
    method: "POST",
    body: JSON.stringify({ type: "google", refresh_token: refreshToken, email: userEmail }),
  });
  return res.json() as Promise<RecallCalendarIntegration>;
}

export async function deleteRecallCalendarIntegration(calendarId: string): Promise<void> {
  await recallFetch(`/api/calendar-integrations/${calendarId}/`, { method: "DELETE" });
}

export async function scheduleRecallBot(
  meetingUrl: string,
  scheduledStartTime: string,
  scheduledEndTime: string,
): Promise<RecallBot> {
  const res = await recallFetch("/api/bots/", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: meetingUrl,
      scheduled_start_time: scheduledStartTime,
      scheduled_end_time: scheduledEndTime,
      transcript: true,
      realtime_transcription: true,
    }),
  });
  return res.json() as Promise<RecallBot>;
}

export async function cancelRecallBot(botId: string): Promise<void> {
  await recallFetch(`/api/bots/${botId}/cancel/`, { method: "POST" });
}

export async function getRecallBotStatus(botId: string): Promise<RecallBot> {
  const res = await recallFetch(`/api/bots/${botId}/`);
  return res.json() as Promise<RecallBot>;
}

export function verifyRecallWebhookSignature(
  signature: string | undefined,
  body: string,
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret || process.env.NODE_ENV === "development") return true;
  return signature === secret;
}
