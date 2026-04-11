import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { prisma } from "../lib/prisma.js";
import { decryptToken } from "../lib/tokenCrypto.js";
import { detectMeetingPlatform } from "../types/recall.types.js";
import {
  createRecallBotForMeeting,
  fetchTranscriptFromDownloadUrl,
  getRecallBot,
} from "./recallClient.js";
import {
  extractBotStatus,
  pickTranscriptDownloadUrl,
} from "./recallMeetingUtils.js";
import { saveMeetingTranscript } from "./recallTranscriptIngestion.js";

const POLL_INTERVAL_MS = 10_000; // 10 seconds
const AUTOMATION_JOIN_LEAD_MINUTES = Number(
  process.env.RECALL_AUTOMATION_JOIN_LEAD_MINUTES ?? "1",
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCalendarClient(refreshTokenEnc: string) {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Workspace OAuth credentials not configured");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  const refreshToken = decryptToken(refreshTokenEnc);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

function asMode(mode: string | null | undefined): "manual" | "automation" {
  return mode === "automation" ? "automation" : "manual";
}

function extractMeetingUrl(event: calendar_v3.Schema$Event): string | null {
  const directConferenceUrl =
    event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video" && typeof ep.uri === "string",
    )?.uri ?? null;
  if (directConferenceUrl) {
    return directConferenceUrl;
  }

  if (typeof event.hangoutLink === "string" && event.hangoutLink.length > 0) {
    return event.hangoutLink;
  }

  const textCandidates = [event.location, event.description]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join("\n");

  if (!textCandidates) {
    return null;
  }

  const match = textCandidates.match(
    /https?:\/\/(?:meet\.google\.com|\w+\.zoom\.us|teams\.microsoft\.com)[^\s)\]">]*/i,
  );

  return match?.[0] ?? null;
}

async function runRecallAutomation(userId: string): Promise<void> {
  const now = new Date();
  const leadMinutes = Number.isFinite(AUTOMATION_JOIN_LEAD_MINUTES)
    ? Math.max(1, AUTOMATION_JOIN_LEAD_MINUTES)
    : 1;
  const nearFuture = new Date(now.getTime() + leadMinutes * 60 * 1000);

  const toSend = await prisma.meeting.findMany({
    where: {
      userId,
      isDeleted: false,
      botId: null,
      meetingUrl: { not: null },
      startTimeUtc: { gte: now, lte: nearFuture },
      endTimeUtc: { gt: now },
    },
    orderBy: { startTimeUtc: "asc" },
    take: 20,
  });

  if (toSend.length > 0) {
    console.log(
      `[Recall Automation] ${toSend.length} meeting(s) eligible for auto-join for user ${userId}`,
    );
  }

  for (const meeting of toSend) {
    if (!meeting.meetingUrl) continue;
    try {
      const bot = await createRecallBotForMeeting(meeting.meetingUrl);
      const status = extractBotStatus(bot);

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          botId: bot.id,
          botStatus: status.code ?? "joining",
          botStatusSubCode: status.subCode,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Recall Automation] Failed to send bot for meeting ${meeting.id}:`,
        message,
      );
    }
  }

  const endedMeetings = await prisma.meeting.findMany({
    where: {
      userId,
      isDeleted: false,
      botId: { not: null },
      OR: [
        { endTimeUtc: { lte: now } },
        { botStatus: { in: ["left", "completed", "failed"] } },
      ],
      transcripts: { none: {} },
    },
    orderBy: { endTimeUtc: "desc" },
    take: 50,
  });

  for (const meeting of endedMeetings) {
    if (!meeting.botId) continue;

    try {
      const bot = await getRecallBot(meeting.botId);
      const status = extractBotStatus(bot);
      const downloadUrl = pickTranscriptDownloadUrl(bot);

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          botStatus: status.code ?? meeting.botStatus,
          botStatusSubCode: status.subCode,
        },
      });

      if (!downloadUrl) continue;

      const transcript = await fetchTranscriptFromDownloadUrl(downloadUrl);
      const saved = await saveMeetingTranscript({
        meetingId: meeting.id,
        botId: meeting.botId,
        transcript,
        replaceExisting: false,
      });

      if (saved.inserted > 0) {
        console.log(
          `[Recall Automation] Saved ${saved.inserted} transcript chunks for meeting ${meeting.id}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Recall Automation] Failed transcript ingest for meeting ${meeting.id}:`,
        message,
      );
    }
  }
}

// ── Sync and Save Calendar Events ────────────────────────────────────────────

async function syncUserCalendar(userId: string) {
  const settings = await prisma.recallBotSettings.findUnique({
    where: { userId },
  });

  // Only sync if the user has enabled Recall Bot
  if (!settings?.isEnabled) {
    return;
  }

  const googleCredential = await prisma.integrationCredential.findUnique({
    where: { userId_provider: { userId, provider: "google_workspace" } },
    select: { isActive: true, refreshTokenEnc: true },
  });

  if (!googleCredential?.isActive || !googleCredential.refreshTokenEnc) {
    return;
  }

  const calendarConn = await prisma.calendarConnection.findFirst({
    where: { userId, isActive: true },
  });

  if (!calendarConn) {
    return; // No calendar connected
  }

  try {
    const calendar = getCalendarClient(calendarConn.refreshTokenEnc);

    // Fetch upcoming events (next 24 hours)
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: calendarConn.calendarId,
      timeMin: now.toISOString(),
      timeMax: twentyFourHoursLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items ?? [];

    // Upsert each event into our database
    for (const event of events) {
      if (!event.id || !event.start?.dateTime || !event.end?.dateTime) continue;

      const meetingUrl = extractMeetingUrl(event);

      const platform = meetingUrl ? detectMeetingPlatform(meetingUrl) : null;

      // Upsert meeting
      await prisma.meeting.upsert({
        where: {
          eventId_calendarId: {
            eventId: event.id,
            calendarId: calendarConn.calendarId,
          },
        },
        update: {
          title: event.summary ?? null,
          meetingUrl,
          platform,
          startTimeUtc: new Date(event.start.dateTime),
          endTimeUtc: new Date(event.end.dateTime),
        },
        create: {
          eventId: event.id,
          calendarId: calendarConn.calendarId,
          userId,
          title: event.summary ?? null,
          meetingUrl,
          platform,
          startTimeUtc: new Date(event.start.dateTime),
          endTimeUtc: new Date(event.end.dateTime),
          botStatus: null, // Recall will update this via webhooks
        },
      });

      // Upsert attendees
      const attendees = event.attendees ?? [];
      for (const attendee of attendees) {
        if (!attendee.email) continue;

        // Find the meeting we just upserted to get its ID
        const meeting = await prisma.meeting.findUnique({
          where: {
            eventId_calendarId: {
              eventId: event.id,
              calendarId: calendarConn.calendarId,
            },
          },
          select: { id: true },
        });

        if (!meeting) continue;

        await prisma.meetingAttendee.upsert({
          where: {
            meetingId_attendeeEmail: {
              meetingId: meeting.id,
              attendeeEmail: attendee.email,
            },
          },
          update: {
            isOrganizer: attendee.organizer ?? false,
            responseStatus: attendee.responseStatus ?? null,
          },
          create: {
            meetingId: meeting.id,
            attendeeEmail: attendee.email,
            isOrganizer: attendee.organizer ?? false,
            responseStatus: attendee.responseStatus ?? null,
          },
        });
      }
    }

    // Update last synced time
    await prisma.recallBotSettings.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    });

    if (asMode(settings.mode) === "automation") {
      await runRecallAutomation(userId);
    }

    console.log(
      `[Recall Sync] Synced ${events.length} events for user ${userId}`,
    );
  } catch (err) {
    console.error(
      `[Recall Sync] Error syncing calendar for user ${userId}:`,
      err,
    );
  }
}

// ── Poll All Enabled Users ───────────────────────────────────────────────────

async function pollAllCalendars() {
  const enabledUsers = await prisma.recallBotSettings.findMany({
    where: { isEnabled: true },
    select: { userId: true },
  });

  for (const { userId } of enabledUsers) {
    await syncUserCalendar(userId);
  }
}

async function safePollAllCalendars() {
  try {
    await pollAllCalendars();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Recall] Calendar sync poll failed:", message);
  }
}

// ── Start Polling Loop ───────────────────────────────────────────────────────

let pollingInterval: NodeJS.Timeout | null = null;

export function startCalendarSync() {
  if (pollingInterval) {
    console.warn("[Recall] Calendar sync already started");
    return;
  }

  if (!process.env.RECALL_API_KEY) {
    console.warn("[Recall] RECALL_API_KEY not set, skipping calendar sync");
    return;
  }

  console.log("[Recall] Starting calendar sync loop (every 10s)...");

  // Initial sync
  void safePollAllCalendars();

  pollingInterval = setInterval(() => {
    void safePollAllCalendars();
  }, POLL_INTERVAL_MS);
}

export function stopCalendarSync() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log("[Recall] Stopped calendar sync");
  }
}

// ── Manual Sync Trigger ──────────────────────────────────────────────────────

export async function syncUserCalendarNow(userId: string) {
  await syncUserCalendar(userId);
}
