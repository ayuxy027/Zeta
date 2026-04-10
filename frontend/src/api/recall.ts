const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";

const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json();
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface RecallSettings {
  isEnabled: boolean;
  lastSyncedAt: string | null;
}

export interface CalendarStatus {
  connected: boolean;
  calendarId: string | null;
  calendarEmail: string | null;
  platform: string | null;
}

export interface Meeting {
  id: string;
  title: string | null;
  meetingUrl: string | null;
  platform: string | null;
  startTimeUtc: string;
  endTimeUtc: string;
  botId: string | null;
  botStatus: string | null;
  attendees?: MeetingAttendee[];
  transcriptCount?: number;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  attendeeEmail: string;
  isOrganizer: boolean;
  responseStatus: string | null;
}

export interface Transcript {
  id: string;
  meetingId: string;
  botId: string;
  speaker: string | null;
  speakerId: string | null;
  transcriptText: string;
  startTranscriptTime: string;
  endTranscriptTime: string;
  createdAt: string;
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function fetchRecallSettings(): Promise<RecallSettings> {
  return fetchWithAuth("/api/recall/settings");
}

export async function updateRecallSettings(isEnabled: boolean): Promise<RecallSettings> {
  return fetchWithAuth("/api/recall/settings", {
    method: "POST",
    body: JSON.stringify({ isEnabled }),
  });
}

// ── Calendar ───────────────────────────────────────────────────────────────

export async function connectCalendar(): Promise<CalendarStatus> {
  return fetchWithAuth("/api/recall/connect-calendar", {
    method: "POST",
  });
}

export async function fetchCalendarStatus(): Promise<CalendarStatus> {
  return fetchWithAuth("/api/recall/calendar-status");
}

// ── Meetings ──────────────────────────────────────────────────────────────

export async function fetchUpcomingMeetings(): Promise<Meeting[]> {
  return fetchWithAuth("/api/recall/upcoming-meetings");
}

export async function fetchMeetingHistory(): Promise<Meeting[]> {
  return fetchWithAuth("/api/recall/meeting-history");
}

export async function fetchMeetingTranscripts(meetingId: string): Promise<Transcript[]> {
  return fetchWithAuth(`/api/recall/meetings/${meetingId}/transcripts`);
}
