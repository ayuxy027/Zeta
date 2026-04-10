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
import { encryptToken, decryptToken } from "../lib/tokenCrypto.js";
import {
  extractBestBodyText,
  headersFromMessage,
  pickHeader,
} from "../lib/gmailParse.js";
import { runPipeline } from "../pipeline/pipeline.js";
import type { PipelinePayload } from "../pipeline/types.js";
import { prisma } from "../lib/prisma.js";

const { requiresAuth } = oidc;

const MAX_LIST_RESULTS = 50;
const METADATA_FETCH_CONCURRENCY = 10;

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

type HttpishError = { response?: { status?: number; data?: unknown } };

function isHttpishError(e: unknown): e is HttpishError {
  return typeof e === "object" && e !== null && "response" in e;
}

function mapGmailError(e: unknown): { status: number; error: string; code?: string } {
  if (isHttpishError(e) && e.response) {
    const status = e.response.status ?? 502;
    const reason = (e.response.data as { error?: { message?: string } })?.error
      ?.message;
    const msg =
      typeof reason === "string" && reason.length > 0
        ? reason
        : (e as Error).message || "Gmail API request failed.";
    if (status === 401 || status === 403) {
      return {
        status: 403,
        error:
          "Gmail access was denied or revoked. Disconnect and connect Gmail again.",
        code: "gmail_auth",
      };
    }
    if (status === 429) {
      return {
        status: 429,
        error: "Gmail rate limit reached. Wait a moment and try again.",
        code: "gmail_rate_limit",
      };
    }
    return { status: status >= 400 && status < 600 ? status : 502, error: msg };
  }
  if (e instanceof Error) {
    return { status: 500, error: e.message };
  }
  return { status: 500, error: "Unknown error" };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const part = await Promise.all(chunk.map((item) => fn(item)));
    out.push(...part);
  }
  return out;
}

export type MailListItem = {
  id: string;
  threadId: string | null;
  snippet: string | null;
  subject: string | null;
  from: string | null;
  date: string | null;
  labelIds: string[];
};

async function fetchMessageListItem(
  gmail: ReturnType<typeof google.gmail>,
  id: string,
): Promise<MailListItem> {
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
  return {
    id,
    threadId: msg.data.threadId ?? null,
    snippet: msg.data.snippet ?? null,
    subject: pick("Subject"),
    from: pick("From"),
    date: pick("Date"),
    labelIds: msg.data.labelIds ?? [],
  };
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

        let refreshToken = tokens.refresh_token;
        if (!refreshToken) {
          const { rows } = await pool.query<{ refresh_token_encrypted: string }>(
            `SELECT refresh_token_encrypted FROM google_mail_connections WHERE user_sub = $1`,
            [verified.sub],
          );
          const existing = rows[0];
          if (existing?.refresh_token_encrypted) {
            refreshToken = decryptToken(existing.refresh_token_encrypted);
          }
        }

        if (!refreshToken) {
          res.redirect(`${frontend}/dashboard/mail?error=no_refresh_token`);
          return;
        }

        oauth2.setCredentials({ ...tokens, refresh_token: refreshToken });
        const email = await fetchGmailProfileEmail(oauth2);
        const encrypted = encryptToken(refreshToken);
        await pool.query(
          `INSERT INTO google_mail_connections (user_sub, refresh_token_encrypted, google_email, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_sub) DO UPDATE SET
           refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
           google_email = COALESCE(EXCLUDED.google_email, google_mail_connections.google_email),
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
    "/mail/labels",
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
      try {
        const gmail = google.gmail({ version: "v1", auth });
        const list = await gmail.users.labels.list({ userId: "me" });
        const labels = (list.data.labels ?? [])
          .filter((l): l is { id: string; name: string; type?: string | null } =>
            Boolean(l.id && l.name),
          )
          .map((l) => ({
            id: l.id as string,
            name: l.name as string,
            type: l.type ?? undefined,
          }));
        res.json({ labels });
      } catch (e) {
        const m = mapGmailError(e);
        res.status(m.status).json({ error: m.error, code: m.code });
      }
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

      const labelId =
        typeof req.query.labelId === "string" && req.query.labelId.length > 0
          ? req.query.labelId
          : undefined;

      const includeSpamTrash =
        typeof req.query.includeSpamTrash === "string" &&
        (req.query.includeSpamTrash === "1" || req.query.includeSpamTrash === "true");

      const gmail = google.gmail({ version: "v1", auth });

      try {
        const list = await gmail.users.messages.list({
          userId: "me",
          q: q || undefined,
          maxResults,
          pageToken,
          labelIds: labelId ? [labelId] : undefined,
          includeSpamTrash,
        });

        const ids = (list.data.messages ?? [])
          .map((m) => m.id)
          .filter((id): id is string => typeof id === "string");

        const messages = await mapWithConcurrency(
          ids,
          METADATA_FETCH_CONCURRENCY,
          (id) => fetchMessageListItem(gmail, id),
        );

        res.json({
          messages,
          nextPageToken: list.data.nextPageToken ?? null,
          resultSizeEstimate: list.data.resultSizeEstimate ?? null,
        });
      } catch (e) {
        const m = mapGmailError(e);
        res.status(m.status).json({ error: m.error, code: m.code });
      }
    },
  );

  router.get(
    "/mail/messages/:messageId",
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

      const rawId = req.params.messageId;
      const messageId =
        typeof rawId === "string"
          ? rawId.trim()
          : Array.isArray(rawId)
            ? rawId[0]?.trim() ?? ""
            : "";
      if (!messageId) {
        res.status(400).json({ error: "Missing message id." });
        return;
      }

      const gmail = google.gmail({ version: "v1", auth });

      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const data = msg.data;
        const headers = headersFromMessage(data);
        const bodyText = extractBestBodyText(data.payload ?? undefined);

        const subject = pickHeader(headers, "Subject");
        const from = pickHeader(headers, "From");
        const date = pickHeader(headers, "Date");

        // Persist raw message to PostgreSQL (resolve auth0Sub → Prisma User.id)
        prisma.user.findUnique({ where: { auth0Sub: userSub }, select: { id: true } })
          .then((dbUser: { id: string } | null) => {
            if (!dbUser) return;
            return prisma.gmailMessage.upsert({
              where: { userId_gmailMessageId: { userId: dbUser.id, gmailMessageId: data.id ?? messageId } },
              update: {},
              create: {
                userId: dbUser.id,
                gmailMessageId: data.id ?? messageId,
                threadId: data.threadId ?? null,
                subject,
                from,
                to: pickHeader(headers, "To"),
                date,
                snippet: data.snippet ?? null,
                bodyText: bodyText ?? null,
                labelIds: data.labelIds ?? [],
              },
            });
          })
          .catch((err: unknown) => console.warn("[gmail] DB persist failed:", (err instanceof Error ? err.message : String(err))));

        // Run through universal pipeline (async, non-blocking)
        if (bodyText?.trim()) {
          const pipelinePayload: PipelinePayload = {
            source_id: `gmail_${data.id ?? messageId}`,
            source_type: "gmail",
            raw_text: bodyText,
            metadata: {
              author: from ?? undefined,
              timestamp: date
                ? new Date(date).toISOString()
                : new Date().toISOString(),
              subject: subject ?? undefined,
            },
          };
          runPipeline(pipelinePayload).catch((err) =>
            console.error("[gmail] Pipeline error:", err),
          );
        }

        res.json({
          id: data.id ?? messageId,
          threadId: data.threadId ?? null,
          snippet: data.snippet ?? null,
          subject,
          from,
          to: pickHeader(headers, "To"),
          date,
          labelIds: data.labelIds ?? [],
          bodyText,
        });
      } catch (e) {
        const m = mapGmailError(e);
        if (m.status === 404 || (isHttpishError(e) && e.response?.status === 404)) {
          res.status(404).json({ error: "Message not found." });
          return;
        }
        res.status(m.status).json({ error: m.error, code: m.code });
      }
    },
  );

  return router;
}
