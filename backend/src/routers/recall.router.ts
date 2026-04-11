import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import { prisma } from "../lib/prisma.js";
import { syncUserCalendarNow } from "../services/calendarSync.js";
import {
  createRecallBotForMeeting,
  fetchTranscriptFromDownloadUrl,
  getRecallBot,
  type RecallBot,
} from "../services/recallClient.js";
import {
  extractBotStatus,
  normalizeBotStatus,
  pickTranscriptDownloadUrl,
} from "../services/recallMeetingUtils.js";
import { saveMeetingTranscript } from "../services/recallTranscriptIngestion.js";

type RecallMode = "manual" | "automation";

function normalizeRecallMode(mode: unknown): RecallMode {
  return mode === "automation" ? "automation" : "manual";
}

const { requiresAuth } = oidc;

async function resolveUserId(auth0Sub: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { auth0Sub },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function refreshBotStatuses(
  meetings: Array<{ id: string; botId: string | null }>,
) {
  const withBots = meetings.filter((m) => !!m.botId) as Array<{
    id: string;
    botId: string;
  }>;
  if (withBots.length === 0) return;

  await Promise.all(
    withBots.map(async (m) => {
      try {
        const bot = await getRecallBot(m.botId);
        const status = extractBotStatus(bot);
        await prisma.meeting.update({
          where: { id: m.id },
          data: {
            botStatus: status.code,
            botStatusSubCode: status.subCode,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[Recall] Failed to refresh bot status for meeting ${m.id}:`,
          message,
        );
      }
    }),
  );
}

export function createRecallRouter() {
  const router = express.Router();

  router.get(
    "/settings",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const settings = await prisma.recallBotSettings.findUnique({
        where: { userId },
      });
      res.json({
        isEnabled: settings?.isEnabled ?? false,
        mode: normalizeRecallMode(settings?.mode),
        lastSyncedAt: settings?.lastSyncedAt ?? null,
      });
    },
  );

  router.post(
    "/settings",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { isEnabled, mode } = req.body as {
        isEnabled?: boolean;
        mode?: RecallMode;
      };

      const hasIsEnabled = typeof isEnabled === "boolean";
      const hasMode = mode === "manual" || mode === "automation";

      if (!hasIsEnabled && !hasMode) {
        res.status(400).json({
          error: "Provide at least one valid setting: isEnabled or mode",
        });
        return;
      }

      const updateData: { isEnabled?: boolean; mode?: RecallMode } = {};
      if (hasIsEnabled) {
        updateData.isEnabled = isEnabled;
      }
      if (hasMode) {
        updateData.mode = mode;
      }

      const settings = await prisma.recallBotSettings.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          isEnabled: hasIsEnabled ? isEnabled : false,
          mode: hasMode ? mode : "manual",
        },
      });
      res.json({
        isEnabled: settings.isEnabled,
        mode: normalizeRecallMode(settings.mode),
        lastSyncedAt: settings.lastSyncedAt,
      });
    },
  );

  router.post(
    "/connect-calendar",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const googleCred = await prisma.integrationCredential.findUnique({
        where: { userId_provider: { userId, provider: "google_workspace" } },
      });
      if (!googleCred?.refreshTokenEnc || !googleCred?.providerEmail) {
        res.status(400).json({
          error: "Google Workspace not connected. Please connect it first.",
        });
        return;
      }

      try {
        const calendarId = "primary";
        await prisma.calendarConnection.upsert({
          where: { calendarId },
          update: {
            refreshTokenEnc: googleCred.refreshTokenEnc,
            isActive: true,
            userId,
          },
          create: {
            userId,
            calendarId,
            calendarEmail: googleCred.providerEmail,
            refreshTokenEnc: googleCred.refreshTokenEnc,
            platform: "google",
            isActive: true,
          },
        });
        res.json({
          connected: true,
          calendarId,
          calendarEmail: googleCred.providerEmail,
        });
      } catch (err) {
        console.error("[Recall] Failed to connect calendar:", err);
        res.status(500).json({ error: "Failed to connect calendar" });
      }
    },
  );

  router.get(
    "/calendar-status",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const googleCredential = await prisma.integrationCredential.findUnique({
        where: { userId_provider: { userId, provider: "google_workspace" } },
      });

      const calendar = await prisma.calendarConnection.findFirst({
        where: { userId, isActive: true },
      });

      const hasActiveGoogle =
        !!googleCredential?.isActive && !!googleCredential.refreshTokenEnc;
      const connected = hasActiveGoogle && !!calendar;

      res.json({
        connected,
        calendarId: connected ? (calendar?.calendarId ?? null) : null,
        calendarEmail: connected
          ? (googleCredential?.providerEmail ?? calendar?.calendarEmail ?? null)
          : null,
        platform: connected ? (calendar?.platform ?? null) : null,
      });
    },
  );

  router.post(
    "/sync-now",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) return res.status(401).json({ error: "Unauthorized" });
      const userId = await resolveUserId(auth0Sub);
      if (!userId) return res.status(404).json({ error: "User not found" });
      try {
        await syncUserCalendarNow(userId);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ error: "Sync failed" });
      }
    },
  );

  router.get(
    "/upcoming-meetings",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const now = new Date();
      const dayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const meetings = await prisma.meeting.findMany({
        where: {
          userId,
          startTimeUtc: { gte: now, lte: dayLater },
          isDeleted: false,
        },
        include: { attendees: true },
        orderBy: { startTimeUtc: "asc" },
      });

      const payload = meetings.map((m) => ({
        id: m.id,
        title: m.title,
        meetingUrl: m.meetingUrl,
        platform: m.platform,
        startTimeUtc: m.startTimeUtc,
        endTimeUtc: m.endTimeUtc,
        botId: m.botId,
        botStatus: m.botStatus,
        attendees: m.attendees,
      }));

      res.json(payload);

      // Refresh statuses asynchronously so API response stays fast.
      void refreshBotStatuses(
        meetings.map((m) => ({ id: m.id, botId: m.botId })),
      );
    },
  );

  router.get(
    "/meetings/:meetingId/transcripts",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { meetingId } = req.params as { meetingId: string };
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, userId },
      });
      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }

      const transcripts = await prisma.transcript.findMany({
        where: { meetingId },
        orderBy: { startTranscriptTime: "asc" },
      });
      res.json(transcripts);
    },
  );

  router.get(
    "/meeting-history",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const meetings = await prisma.meeting.findMany({
        where: {
          userId,
          isDeleted: false,
          OR: [
            { endTimeUtc: { lte: new Date() } },
            { botStatus: { in: ["left", "completed", "failed"] } },
          ],
        },
        include: { transcripts: { select: { id: true } } },
        orderBy: { startTimeUtc: "desc" },
        take: 50,
      });

      const payload = meetings.map((m) => ({
        id: m.id,
        title: m.title,
        meetingUrl: m.meetingUrl,
        platform: m.platform,
        startTimeUtc: m.startTimeUtc,
        endTimeUtc: m.endTimeUtc,
        botId: m.botId,
        botStatus: m.botStatus,
        transcriptCount: m.transcripts.length,
      }));

      res.json(payload);

      // Refresh statuses asynchronously so API response stays fast.
      void refreshBotStatuses(
        meetings.map((m) => ({ id: m.id, botId: m.botId })),
      );
    },
  );

  router.post(
    "/meetings/:meetingId/send-bot",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { meetingId } = req.params as { meetingId: string };
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, userId, isDeleted: false },
      });
      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      if (!meeting.meetingUrl) {
        res.status(400).json({ error: "Meeting has no join URL" });
        return;
      }

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

        res.json({
          ok: true,
          botId: bot.id,
          botStatus: status.code ?? "joining",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send bot";
        res.status(500).json({ error: message });
      }
    },
  );

  router.post(
    "/meetings/:meetingId/fetch-transcript",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const { meetingId } = req.params as { meetingId: string };
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, userId, isDeleted: false },
      });
      if (!meeting) {
        res.status(404).json({ error: "Meeting not found" });
        return;
      }
      if (!meeting.botId) {
        res
          .status(400)
          .json({ error: "Bot has not been sent for this meeting" });
        return;
      }

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

        if (!downloadUrl) {
          res.status(202).json({
            ok: false,
            ready: false,
            botStatus: status.code,
            error: "Transcript is not ready yet. Try again after meeting ends.",
          });
          return;
        }

        const transcript = await fetchTranscriptFromDownloadUrl(downloadUrl);
        const saved = await saveMeetingTranscript({
          meetingId: meeting.id,
          botId: meeting.botId,
          transcript,
          replaceExisting: true,
        });

        if (saved.inserted === 0) {
          res.status(202).json({
            ok: false,
            ready: false,
            error: "Transcript downloaded but no usable rows found",
          });
          return;
        }

        res.json({ ok: true, ready: true, inserted: saved.inserted });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch transcript";
        res.status(500).json({ error: message });
      }
    },
  );

  return router;
}
