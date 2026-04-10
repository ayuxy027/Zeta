import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import { google } from "googleapis";
import {
  createOAuth2Client,
  fetchGmailProfileEmail,
  getOAuth2ClientForMailUser,
} from "../services/googleDriveClient.js";
import { getPool } from "../db/pool.js";
import { signOAuthState, verifyOAuthState } from "../lib/oauthState.js";
import { encryptToken } from "../lib/tokenCrypto.js";

const { requiresAuth } = oidc;

const MAX_LIST_RESULTS = 50;

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() ?? "http://localhost:5173";
}

function getStateSecret(): string {
  const s = process.env.AUTH0_SECRET?.trim();
  if (!s) {
    throw new Error("AUTH0_SECRET is required for Google OAuth state signing.");
  }
  return s;
}

function requireDb(_req: Request, res: Response, next: () => void) {
  if (!getPool()) {
    res.status(503).json({ error: "Database not configured (set DB_URL)." });
    return;
  }
  next();
}

function requireGoogleMailEnv(_req: Request, res: Response, next: () => void) {
  try {
    createOAuth2Client("mail");
    next();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Google OAuth is not configured.";
    res.status(503).json({ error: message });
  }
}

export function createGmailRouter() {
  const router = express.Router();

  router.get(
    "/integrations/google-mail/auth",
    requiresAuth(),
    requireDb,
    requireGoogleMailEnv,
    (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Missing user id" });
        return;
      }
      const oauth2 = createOAuth2Client("mail");
      const state = signOAuthState(userSub, getStateSecret());
      const url = oauth2.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: ["https://www.googleapis.com/auth/gmail.readonly"],
        state,
      });
      res.redirect(url);
    },
  );

  router.get(
    "/integrations/google-mail/callback",
    async (req: Request, res: Response) => {
      const frontend = getFrontendUrl().replace(/\/$/, "");
      const error =
        typeof req.query.error === "string" ? req.query.error : undefined;
      if (error) {
        res.redirect(
          `${frontend}/dashboard/mail?error=${encodeURIComponent(error)}`,
        );
        return;
      }
      const code =
        typeof req.query.code === "string" ? req.query.code : undefined;
      const state =
        typeof req.query.state === "string" ? req.query.state : undefined;
      if (!code || !state) {
        res.redirect(`${frontend}/dashboard/mail?error=missing_code`);
        return;
      }
      const verified = verifyOAuthState(state, getStateSecret());
      if (!verified) {
        res.redirect(`${frontend}/dashboard/mail?error=invalid_state`);
        return;
      }
      if (
        req.oidc.isAuthenticated() &&
        req.oidc.user?.sub &&
        req.oidc.user.sub !== verified.sub
      ) {
        res.redirect(`${frontend}/dashboard/mail?error=session_mismatch`);
        return;
      }
      const pool = getPool();
      if (!pool) {
        res.redirect(`${frontend}/dashboard/mail?error=no_database`);
        return;
      }

      try {
        const oauth2 = createOAuth2Client("mail");
        const { tokens } = await oauth2.getToken(code);
        if (!tokens.refresh_token) {
          res.redirect(`${frontend}/dashboard/mail?error=no_refresh_token`);
          return;
        }
        oauth2.setCredentials(tokens);
        const email = await fetchGmailProfileEmail(oauth2);
        const encrypted = encryptToken(tokens.refresh_token);
        await pool.query(
          `INSERT INTO google_mail_connections (user_sub, refresh_token_encrypted, google_email, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_sub) DO UPDATE SET
           refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
           google_email = EXCLUDED.google_email,
           updated_at = NOW()`,
          [verified.sub, encrypted, email],
        );
        res.redirect(`${frontend}/dashboard/mail?connected=1`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "oauth_failed";
        res.redirect(
          `${frontend}/dashboard/mail?error=${encodeURIComponent(message)}`,
        );
      }
    },
  );

  router.get(
    "/integrations/google-mail/status",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const pool = getPool()!;
      const { rows } = await pool.query<{ google_email: string | null }>(
        `SELECT google_email FROM google_mail_connections WHERE user_sub = $1`,
        [userSub],
      );
      const row = rows[0];
      res.json({
        connected: Boolean(row),
        googleEmail: row?.google_email ?? null,
      });
    },
  );

  router.post(
    "/integrations/google-mail/disconnect",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const pool = getPool()!;
      await pool.query(
        `DELETE FROM google_mail_connections WHERE user_sub = $1`,
        [userSub],
      );
      res.json({ ok: true });
    },
  );

  router.get(
    "/mail/messages",
    requiresAuth(),
    requireDb,
    requireGoogleMailEnv,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const auth = await getOAuth2ClientForMailUser(userSub);
      if (!auth) {
        res.status(400).json({ error: "Gmail is not connected." });
        return;
      }

      const qRaw = typeof req.query.q === "string" ? req.query.q : "";
      const q = qRaw.slice(0, 2000);

      let maxResults = 20;
      if (typeof req.query.maxResults === "string") {
        const n = Number.parseInt(req.query.maxResults, 10);
        if (!Number.isNaN(n)) {
          maxResults = Math.min(Math.max(1, n), MAX_LIST_RESULTS);
        }
      }

      const pageToken =
        typeof req.query.pageToken === "string" && req.query.pageToken.length > 0
          ? req.query.pageToken
          : undefined;

      const gmail = google.gmail({ version: "v1", auth });
      const list = await gmail.users.messages.list({
        userId: "me",
        q: q || undefined,
        maxResults,
        pageToken,
      });

      const ids = (list.data.messages ?? [])
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string");

      const messages: Array<{
        id: string;
        threadId: string | null;
        snippet: string | null;
        subject: string | null;
        from: string | null;
        date: string | null;
      }> = [];

      for (const id of ids) {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });
        const headers = msg.data.payload?.headers ?? [];
        const pick = (name: string): string | null => {
          const h = headers.find(
            (x) => x.name?.toLowerCase() === name.toLowerCase(),
          );
          return typeof h?.value === "string" ? h.value : null;
        };
        messages.push({
          id,
          threadId: msg.data.threadId ?? null,
          snippet: msg.data.snippet ?? null,
          subject: pick("Subject"),
          from: pick("From"),
          date: pick("Date"),
        });
      }

      res.json({
        messages,
        nextPageToken: list.data.nextPageToken ?? null,
        resultSizeEstimate: list.data.resultSizeEstimate ?? null,
      });
    },
  );

  return router;
}
