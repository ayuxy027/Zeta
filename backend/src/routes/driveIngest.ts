import express, { type Request, type Response } from 'express';
import { requiresAuth } from 'express-openid-connect';
import { google } from 'googleapis';
import { createOAuth2Client, downloadDriveFile, fetchDriveAboutEmail, getOAuth2ClientForUser } from '../services/googleDriveClient.js';
import { getPool } from '../db/pool.js';
import { signOAuthState, verifyOAuthState } from '../lib/oauthState.js';
import { encryptToken } from '../lib/tokenCrypto.js';
import { isAllowedMime } from '../lib/allowedMime.js';
import { extractTextFromBuffer } from '../lib/extractText.js';

const MAX_FILES = 20;
const MAX_DISPLAY_NAME_LENGTH = 200;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

const DRIVE_FILE_FIELDS =
  'nextPageToken, files(id, name, mimeType, modifiedTime, size, shortcutDetails(targetId, targetMimeType))';

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() ?? 'http://localhost:5173';
}

function getStateSecret(): string {
  const s = process.env.AUTH0_SECRET?.trim();
  if (!s) {
    throw new Error('AUTH0_SECRET is required for Google OAuth state signing.');
  }
  return s;
}

function requireDb(_req: Request, res: Response, next: () => void) {
  if (!getPool()) {
    res.status(503).json({ error: 'Database not configured (set DB_URL).' });
    return;
  }
  next();
}

function requireGoogleEnv(_req: Request, res: Response, next: () => void) {
  try {
    createOAuth2Client();
    next();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Google OAuth is not configured.';
    res.status(503).json({ error: message });
  }
}

export function createDriveIngestRouter() {
  const router = express.Router();

  router.get(
    '/integrations/google/auth',
    requiresAuth(),
    requireDb,
    requireGoogleEnv,
    (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Missing user id' });
        return;
      }
      const oauth2 = createOAuth2Client();
      const state = signOAuthState(userSub, getStateSecret());
      const url = oauth2.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: true,
        scope: ['https://www.googleapis.com/auth/drive.readonly'],
        state,
      });
      res.redirect(url);
    },
  );

  router.get('/integrations/google/callback', async (req: Request, res: Response) => {
    const frontend = getFrontendUrl().replace(/\/$/, '');
    const error = typeof req.query.error === 'string' ? req.query.error : undefined;
    if (error) {
      res.redirect(`${frontend}/dashboard/drive?error=${encodeURIComponent(error)}`);
      return;
    }
    const code = typeof req.query.code === 'string' ? req.query.code : undefined;
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    if (!code || !state) {
      res.redirect(`${frontend}/dashboard/drive?error=missing_code`);
      return;
    }
    const verified = verifyOAuthState(state, getStateSecret());
    if (!verified) {
      res.redirect(`${frontend}/dashboard/drive?error=invalid_state`);
      return;
    }
    if (req.oidc.isAuthenticated() && req.oidc.user?.sub && req.oidc.user.sub !== verified.sub) {
      res.redirect(`${frontend}/dashboard/drive?error=session_mismatch`);
      return;
    }
    const pool = getPool();
    if (!pool) {
      res.redirect(`${frontend}/dashboard/drive?error=no_database`);
      return;
    }

    try {
      const oauth2 = createOAuth2Client();
      const { tokens } = await oauth2.getToken(code);
      if (!tokens.refresh_token) {
        res.redirect(`${frontend}/dashboard/drive?error=no_refresh_token`);
        return;
      }
      oauth2.setCredentials(tokens);
      const email = await fetchDriveAboutEmail(oauth2);
      const encrypted = encryptToken(tokens.refresh_token);
      await pool.query(
        `INSERT INTO google_drive_connections (user_sub, refresh_token_encrypted, google_email, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_sub) DO UPDATE SET
           refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
           google_email = EXCLUDED.google_email,
           updated_at = NOW()`,
        [verified.sub, encrypted, email],
      );
      res.redirect(`${frontend}/dashboard/drive?connected=1`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'oauth_failed';
      res.redirect(`${frontend}/dashboard/drive?error=${encodeURIComponent(message)}`);
    }
  });

  router.get(
    '/integrations/google/status',
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const pool = getPool()!;
      const { rows } = await pool.query<{ google_email: string | null }>(
        `SELECT google_email FROM google_drive_connections WHERE user_sub = $1`,
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
    '/integrations/google/disconnect',
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const pool = getPool()!;
      await pool.query(`DELETE FROM google_drive_connections WHERE user_sub = $1`, [userSub]);
      res.json({ ok: true });
    },
  );

  router.get(
    '/drive/files',
    requiresAuth(),
    requireDb,
    requireGoogleEnv,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const auth = await getOAuth2ClientForUser(userSub);
      if (!auth) {
        res.status(400).json({ error: 'Google Drive is not connected.' });
        return;
      }
      const drive = google.drive({ version: 'v3', auth });
      const q = [
        'trashed = false and (',
        "mimeType = 'application/pdf'",
        "or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'",
        "or mimeType = 'application/msword'",
        "or mimeType = 'text/plain'",
        "or mimeType = 'application/vnd.google-apps.document'",
        ')',
      ].join(' ');

      const files: Array<{
        id: string;
        name: string;
        mimeType: string;
        modifiedTime: string | null;
        size: string | null;
      }> = [];

      let pageToken: string | undefined;
      do {
        const list = await drive.files.list({
          pageSize: 100,
          pageToken,
          q,
          fields: DRIVE_FILE_FIELDS,
          orderBy: 'modifiedTime desc',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        for (const f of list.data.files ?? []) {
          if (!f.id || !f.name || !f.mimeType) {
            continue;
          }
          if (!isAllowedMime(f.mimeType)) {
            continue;
          }
          files.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime ?? null,
            size: f.size ?? null,
          });
        }
        pageToken = list.data.nextPageToken ?? undefined;
      } while (pageToken && files.length < 500);

      res.json({ files: files.slice(0, 500) });
    },
  );

  router.post(
    '/ingest/drive',
    requiresAuth(),
    requireDb,
    requireGoogleEnv,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const body = req.body as { fileIds?: unknown; displayName?: unknown };
      const fileIds = Array.isArray(body.fileIds) ? body.fileIds.filter((x): x is string => typeof x === 'string') : [];
      const displayName =
        typeof body.displayName === 'string' ? body.displayName.trim() : '';

      if (!displayName || displayName.length > MAX_DISPLAY_NAME_LENGTH) {
        res.status(400).json({
          error: `displayName is required and must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`,
        });
        return;
      }
      if (fileIds.length === 0 || fileIds.length > MAX_FILES) {
        res.status(400).json({ error: `Select between 1 and ${MAX_FILES} files.` });
        return;
      }

      const auth = await getOAuth2ClientForUser(userSub);
      if (!auth) {
        res.status(400).json({ error: 'Google Drive is not connected.' });
        return;
      }

      const drive = google.drive({ version: 'v3', auth });
      const pool = getPool()!;

      const sources: Array<{
        id: string;
        name: string;
        mimeType: string;
        textLength: number;
        warnings: string[];
      }> = [];

      const sections: string[] = [];
      let totalBytes = 0;
      const allWarnings: string[] = [];

      for (const fileId of fileIds) {
        const meta = await drive.files.get({
          fileId,
          fields: 'id, name, mimeType, size',
          supportsAllDrives: true,
        });
        const mime = meta.data.mimeType ?? '';
        const name = meta.data.name ?? 'Untitled';
        if (!isAllowedMime(mime)) {
          res.status(400).json({ error: `File "${name}" has unsupported type: ${mime || 'unknown'}` });
          return;
        }

        const buffer = await downloadDriveFile(auth, fileId, mime);
        totalBytes += buffer.length;
        if (totalBytes > MAX_DOWNLOAD_BYTES) {
          res.status(400).json({ error: 'Selected files exceed the maximum total download size (50 MB).' });
          return;
        }

        const extracted = await extractTextFromBuffer(buffer, mime, name);
        allWarnings.push(...extracted.warnings);
        sources.push({
          id: fileId,
          name,
          mimeType: mime,
          textLength: extracted.text.length,
          warnings: extracted.warnings,
        });
        sections.push(`## ${name}\n\n${extracted.text.trim()}\n`);
      }

      const extractedText = sections.join('\n\n').trim();

      const insert = await pool.query<{ id: string }>(
        `INSERT INTO document_extractions (user_sub, display_name, source_drive_file_ids, sources_json, extracted_text)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5)
         RETURNING id`,
        [userSub, displayName, JSON.stringify(fileIds), JSON.stringify(sources), extractedText],
      );

      const id = insert.rows[0]?.id;
      if (!id) {
        res.status(500).json({ error: 'Failed to save extraction.' });
        return;
      }

      res.json({
        id,
        displayName,
        warnings: allWarnings,
        charCount: extractedText.length,
      });
    },
  );

  router.get(
    '/ingest/documents',
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const pool = getPool()!;
      const { rows } = await pool.query<{
        id: string;
        display_name: string;
        created_at: string;
        preview: string;
      }>(
        `SELECT id, display_name, created_at,
                LEFT(extracted_text, 400) AS preview
           FROM document_extractions
          WHERE user_sub = $1
          ORDER BY created_at DESC
          LIMIT 100`,
        [userSub],
      );
      res.json({
        documents: rows.map((r) => ({
          id: r.id,
          displayName: r.display_name,
          createdAt: r.created_at,
          preview: r.preview,
        })),
      });
    },
  );

  router.get(
    '/ingest/documents/:id',
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const id = req.params.id;
      const pool = getPool()!;
      const { rows } = await pool.query<{
        id: string;
        display_name: string;
        extracted_text: string;
        sources_json: unknown;
        created_at: string;
      }>(
        `SELECT id, display_name, extracted_text, sources_json, created_at
           FROM document_extractions
          WHERE id = $1 AND user_sub = $2`,
        [id, userSub],
      );
      const row = rows[0];
      if (!row) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json({
        id: row.id,
        displayName: row.display_name,
        extractedText: row.extracted_text,
        sources: row.sources_json,
        createdAt: row.created_at,
      });
    },
  );

  return router;
}
