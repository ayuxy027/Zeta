import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import { prisma } from "../lib/prisma.js";

const { requiresAuth } = oidc;

async function resolveUserId(auth0Sub: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { auth0Sub }, select: { id: true } });
  return user?.id ?? null;
}

export function createRecallRouter() {
  const router = express.Router();

  router.get("/settings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const settings = await prisma.recallBotSettings.findUnique({ where: { userId } });
    res.json({ isEnabled: settings?.isEnabled ?? false, lastSyncedAt: settings?.lastSyncedAt ?? null });
  });

  router.post("/settings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const { isEnabled } = req.body as { isEnabled?: boolean };
    if (typeof isEnabled !== "boolean") { res.status(400).json({ error: "isEnabled must be a boolean" }); return; }

    const settings = await prisma.recallBotSettings.upsert({
      where: { userId },
      update: { isEnabled },
      create: { userId, isEnabled },
    });
    res.json({ isEnabled: settings.isEnabled, lastSyncedAt: settings.lastSyncedAt });
  });

  router.post("/connect-calendar", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const googleCred = await prisma.integrationCredential.findUnique({
      where: { userId_provider: { userId, provider: "google_workspace" } },
    });
    if (!googleCred?.refreshTokenEnc || !googleCred?.providerEmail) {
      res.status(400).json({ error: "Google Workspace not connected. Please connect it first." });
      return;
    }

    try {
      const calendarId = "primary";
      await prisma.calendarConnection.upsert({
        where: { calendarId },
        update: { refreshTokenEnc: googleCred.refreshTokenEnc, isActive: true, userId },
        create: {
          userId, calendarId, calendarEmail: googleCred.providerEmail,
          refreshTokenEnc: googleCred.refreshTokenEnc, platform: "google", isActive: true,
        },
      });
      res.json({ connected: true, calendarId, calendarEmail: googleCred.providerEmail });
    } catch (err) {
      console.error("[Recall] Failed to connect calendar:", err);
      res.status(500).json({ error: "Failed to connect calendar" });
    }
  });

  router.get("/calendar-status", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const calendar = await prisma.calendarConnection.findFirst({ where: { userId, isActive: true } });
    res.json({
      connected: !!calendar,
      calendarId: calendar?.calendarId ?? null,
      calendarEmail: calendar?.calendarEmail ?? null,
      platform: calendar?.platform ?? null,
    });
  });

  router.get("/upcoming-meetings", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const now = new Date();
    const dayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const meetings = await prisma.meeting.findMany({
      where: { userId, startTimeUtc: { gte: now, lte: dayLater }, isDeleted: false },
      include: { attendees: true },
      orderBy: { startTimeUtc: "asc" },
    });

    res.json(meetings.map(m => ({
      id: m.id, title: m.title, meetingUrl: m.meetingUrl, platform: m.platform,
      startTimeUtc: m.startTimeUtc, endTimeUtc: m.endTimeUtc,
      botId: m.botId, botStatus: m.botStatus, attendees: m.attendees,
    })));
  });

  router.get("/meetings/:meetingId/transcripts", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const { meetingId } = req.params as { meetingId: string };
    const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, userId } });
    if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

    const transcripts = await prisma.transcript.findMany({
      where: { meetingId },
      orderBy: { startTranscriptTime: "asc" },
    });
    res.json(transcripts);
  });

  router.get("/meeting-history", requiresAuth(), async (req: Request, res: Response) => {
    const auth0Sub = req.oidc.user?.sub;
    if (!auth0Sub) { res.status(401).json({ error: "Unauthorized" }); return; }
    const userId = await resolveUserId(auth0Sub);
    if (!userId) { res.status(404).json({ error: "User not found" }); return; }

    const meetings = await prisma.meeting.findMany({
      where: { userId, endTimeUtc: { lte: new Date() }, isDeleted: false },
      include: { transcripts: { select: { id: true } } },
      orderBy: { startTimeUtc: "desc" },
      take: 50,
    });

    res.json(meetings.map(m => ({
      id: m.id, title: m.title, meetingUrl: m.meetingUrl, platform: m.platform,
      startTimeUtc: m.startTimeUtc, endTimeUtc: m.endTimeUtc,
      botId: m.botId, botStatus: m.botStatus, transcriptCount: m.transcripts.length,
    })));
  });

  return router;
}
