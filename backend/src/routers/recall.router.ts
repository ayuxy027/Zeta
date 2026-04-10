import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import { prisma } from "../lib/prisma.js";

const { requiresAuth } = oidc;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function resolveUserId(auth0Sub: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { auth0Sub },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ── Router ───────────────────────────────────────────────────────────────────

export function createRecallRouter() {
  const router = express.Router();

  // ── GET /api/recall/settings ───────────────────────────────────────────────
  // Get user's recall bot settings

  router.get("/settings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const settings = await prisma.recallBotSettings.findUnique({
      where: { userId },
    });

    res.json({
      isEnabled: settings?.isEnabled ?? false,
      lastSyncedAt: settings?.lastSyncedAt ?? null,
    });
  });

  // ── POST /api/recall/settings ──────────────────────────────────────────────
  // Enable/disable recall bot

  router.post("/settings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const { isEnabled } = req.body as { isEnabled?: boolean };

    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ error: "isEnabled must be a boolean" });
    }

    const settings = await prisma.recallBotSettings.upsert({
      where: { userId },
      update: { isEnabled },
      create: { userId, isEnabled },
    });

    res.json({
      isEnabled: settings.isEnabled,
      lastSyncedAt: settings.lastSyncedAt,
    });
  });

  // ── POST /api/recall/connect-calendar ──────────────────────────────────────
  // Connect Google Calendar using existing Google Workspace credentials

  router.post("/connect-calendar", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has Google Workspace credentials
    const googleCred = await prisma.integrationCredential.findUnique({
      where: { userId_provider: { userId, provider: "google_workspace" } },
    });

    if (!googleCred || !googleCred.refreshTokenEnc || !googleCred.providerEmail) {
      return res.status(400).json({
        error: "Google Workspace not connected. Please connect Google Workspace first.",
      });
    }

    try {
      const userEmail = googleCred.providerEmail;
      // Use "primary" as calendar ID (Google's default calendar)
      const calendarId = "primary";

      // Save calendar connection (reuse existing Google Workspace tokens — no Recall API needed)
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
          calendarEmail: userEmail,
          refreshTokenEnc: googleCred.refreshTokenEnc,
          platform: "google",
          isActive: true,
        },
      });

      res.json({
        connected: true,
        calendarId,
        calendarEmail: userEmail,
      });
    } catch (err) {
      console.error("[Recall] Failed to connect calendar:", err);
      res.status(500).json({ error: "Failed to connect calendar" });
    }
  });

  // ── GET /api/recall/calendar-status ────────────────────────────────────────
  // Check calendar connection status

  router.get("/calendar-status", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const calendar = await prisma.calendarConnection.findFirst({
      where: { userId, isActive: true },
    });

    res.json({
      connected: !!calendar,
      calendarId: calendar?.calendarId ?? null,
      calendarEmail: calendar?.calendarEmail ?? null,
      platform: calendar?.platform ?? null,
    });
  });

  // ── GET /api/recall/upcoming-meetings ──────────────────────────────────────
  // Get upcoming meetings for the user

  router.get("/upcoming-meetings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        startTimeUtc: {
          gte: now,
          lte: twentyFourHoursLater,
        },
        isDeleted: false,
      },
      include: {
        attendees: true,
      },
      orderBy: { startTimeUtc: "asc" },
    });

    res.json(
      meetings.map((m) => ({
        id: m.id,
        title: m.title,
        meetingUrl: m.meetingUrl,
        platform: m.platform,
        startTimeUtc: m.startTimeUtc,
        endTimeUtc: m.endTimeUtc,
        botId: m.botId,
        botStatus: m.botStatus,
        attendees: m.attendees,
      }))
    );
  });

  // ── GET /api/recall/meetings/:meetingId/transcripts ────────────────────────
  // Get transcripts for a specific meeting

  router.get(
    "/meetings/:meetingId/transcripts",
    requiresAuth(),
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        return res.status(404).json({ error: "User not found" });
      }

      const { meetingId } = req.params as { meetingId: string };

      // Verify meeting belongs to user
      const meeting = await prisma.meeting.findFirst({
        where: { id: meetingId, userId },
      });

      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const transcripts = await prisma.transcript.findMany({
        where: { meetingId },
        orderBy: { startTranscriptTime: "asc" },
      });

      res.json(transcripts);
    }
  );

  // ── GET /api/recall/meeting-history ────────────────────────────────────────
  // Get past meetings with transcripts

  router.get("/meeting-history", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await resolveUserId(auth0Sub);
    if (!userId) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();

    const meetings = await prisma.meeting.findMany({
      where: {
        userId,
        endTimeUtc: { lte: now },
        isDeleted: false,
      },
      include: {
        transcripts: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { startTimeUtc: "desc" },
      take: 50,
    });

    res.json(
      meetings.map((m) => ({
        id: m.id,
        title: m.title,
        meetingUrl: m.meetingUrl,
        platform: m.platform,
        startTimeUtc: m.startTimeUtc,
        endTimeUtc: m.endTimeUtc,
        botId: m.botId,
        botStatus: m.botStatus,
        transcriptCount: m.transcripts.length,
      }))
    );
  });

  return router;
}
