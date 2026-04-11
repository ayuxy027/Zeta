const RECALL_API_KEY = process.env.RECALL_API_KEY;
const RECALL_BASE_URL = (
  process.env.RECALL_BASE_URL ?? "https://us-west-2.recall.ai"
).replace(/\/$/, "");

if (!RECALL_API_KEY) {
  console.warn(
    "RECALL_API_KEY is not set. Recall.ai features will be disabled.",
  );
}

function getAuthorizationHeader(): string {
  const key = RECALL_API_KEY?.trim();
  if (!key) {
    throw new Error("RECALL_API_KEY is not configured");
  }

  if (key.startsWith("Token ") || key.startsWith("ApiKey ")) {
    return key;
  }

  return `Token ${key}`;
}

async function recallFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${RECALL_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthorizationHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Recall API ${res.status}: ${body || res.statusText}`);
  }

  return res;
}

export interface RecallCalendarIntegration {
  id: string;
  calendar: { email: string; kind: string; id: string };
}

export interface RecallBot {
  id: string;
  meeting_url?: string;
  status?: string | { code?: string; sub_code?: string };
  status_sub_code?: string | null;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  transcript?: boolean;
  recordings?: RecallRecording[];
}

export interface RecallRecording {
  id: string;
  media_shortcuts?: {
    transcript?: {
      data?: {
        download_url?: string;
      };
    };
  };
}

export interface RecallTranscriptDownloadItem {
  participant?: {
    id?: number | string;
    name?: string;
  };
  words?: Array<{
    text?: string;
    start_timestamp?: { absolute?: string };
    end_timestamp?: { absolute?: string };
  }>;
}

export async function createRecallCalendarIntegration(
  refreshToken: string,
  userEmail: string,
): Promise<RecallCalendarIntegration> {
  const res = await recallFetch("/api/calendar-integrations/", {
    method: "POST",
    body: JSON.stringify({
      type: "google",
      refresh_token: refreshToken,
      email: userEmail,
    }),
  });
  return res.json() as Promise<RecallCalendarIntegration>;
}

export async function deleteRecallCalendarIntegration(
  calendarId: string,
): Promise<void> {
  await recallFetch(`/api/calendar-integrations/${calendarId}/`, {
    method: "DELETE",
  });
}

export async function scheduleRecallBot(
  meetingUrl: string,
  scheduledStartTime: string,
  scheduledEndTime: string,
): Promise<RecallBot> {
  const res = await recallFetch("/api/v1/bot/", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: meetingUrl,
      scheduled_start_time: scheduledStartTime,
      scheduled_end_time: scheduledEndTime,
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              mode: "prioritize_accuracy",
            },
          },
        },
      },
    }),
  });
  return res.json() as Promise<RecallBot>;
}

export async function createRecallBotForMeeting(
  meetingUrl: string,
): Promise<RecallBot> {
  const res = await recallFetch("/api/v1/bot/", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: "Zeta Notetaker",
      recording_config: {
        start_recording_on: "participant_join",
        transcript: {
          provider: {
            recallai_streaming: {
              mode: "prioritize_accuracy",
            },
          },
        },
      },
      variant: {
        zoom: "web_4_core",
        google_meet: "web_4_core",
        microsoft_teams: "web_4_core",
      },
    }),
  });

  return res.json() as Promise<RecallBot>;
}

export async function cancelRecallBot(botId: string): Promise<void> {
  await recallFetch(`/api/v1/bot/${botId}/leave_call/`, { method: "POST" });
}

export async function getRecallBotStatus(botId: string): Promise<RecallBot> {
  const res = await recallFetch(`/api/v1/bot/${botId}/`);
  return res.json() as Promise<RecallBot>;
}

export async function getRecallBot(botId: string): Promise<RecallBot> {
  const res = await recallFetch(`/api/v1/bot/${botId}/`);
  return res.json() as Promise<RecallBot>;
}

export async function fetchTranscriptFromDownloadUrl(
  downloadUrl: string,
): Promise<RecallTranscriptDownloadItem[]> {
  const res = await fetch(downloadUrl, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to download transcript: ${res.status} ${body || res.statusText}`,
    );
  }
  const payload = await res.json();
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected transcript payload shape");
  }
  return payload as RecallTranscriptDownloadItem[];
}

export function verifyRecallWebhookSignature(
  signature: string | undefined,
  body: string,
): boolean {
  const secret = process.env.RECALL_WEBHOOK_SECRET;
  if (!secret || process.env.NODE_ENV === "development") return true;
  return signature === secret;
}
