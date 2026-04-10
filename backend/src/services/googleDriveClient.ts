import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { decryptToken, encryptToken } from "../lib/tokenCrypto.js";
import { getPool } from "../db/pool.js";

export type GoogleIntegrationPurpose = "drive" | "mail";

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET for Google OAuth.",
    );
  }
  return { clientId, clientSecret };
}

function getRedirectUri(purpose: GoogleIntegrationPurpose): string {
  if (purpose === "drive") {
    const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
    if (explicit) {
      return explicit;
    }
  } else {
    const explicit = process.env.GOOGLE_MAIL_REDIRECT_URI?.trim();
    if (explicit) {
      return explicit;
    }
  }
  const backendBase =
    process.env.AUTH0_BASE_URL?.trim() ??
    process.env.BACKEND_PUBLIC_URL?.trim();
  if (!backendBase) {
    throw new Error(
      "Set AUTH0_BASE_URL (or BACKEND_PUBLIC_URL) so Google OAuth redirect URIs can be derived, or set GOOGLE_REDIRECT_URI / GOOGLE_MAIL_REDIRECT_URI.",
    );
  }
  const path =
    purpose === "drive"
      ? "/api/integrations/google/callback"
      : "/api/integrations/google-mail/callback";
  return `${backendBase.replace(/\/$/, "")}${path}`;
}

export function createOAuth2Client(
  purpose: GoogleIntegrationPurpose = "drive",
): OAuth2Client {
  const { clientId, clientSecret } = getGoogleCredentials();
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: getRedirectUri(purpose),
  });
}

function connectionTableForPurpose(purpose: GoogleIntegrationPurpose): string {
  return purpose === "drive"
    ? "google_drive_connections"
    : "google_mail_connections";
}

function attachRefreshTokenPersistence(
  client: OAuth2Client,
  userSub: string,
  purpose: GoogleIntegrationPurpose,
): void {
  const pool = getPool();
  if (!pool) return;

  const table = connectionTableForPurpose(purpose);

  client.on("tokens", (tokens) => {
    if (!tokens.refresh_token) return;
    const encrypted = encryptToken(tokens.refresh_token);
    void pool
      .query(
        `UPDATE ${table}
         SET refresh_token_encrypted = $1,
             updated_at = NOW()
         WHERE user_sub = $2`,
        [encrypted, userSub],
      )
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[google] Failed persisting rotated ${purpose} refresh token:`, message);
      });
  });
}

async function ensureAccessToken(client: OAuth2Client, purpose: GoogleIntegrationPurpose): Promise<boolean> {
  try {
    await client.getAccessToken();
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[google] Could not refresh ${purpose} access token:`, message);
    return false;
  }
}

export async function getOAuth2ClientForUser(
  userSub: string,
): Promise<OAuth2Client | null> {
  const pool = getPool();
  if (!pool) {
    return null;
  }
  const { rows } = await pool.query<{ refresh_token_encrypted: string }>(
    `SELECT refresh_token_encrypted FROM google_drive_connections WHERE user_sub = $1`,
    [userSub],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const refreshToken = decryptToken(row.refresh_token_encrypted);
  const client = createOAuth2Client("drive");
  client.setCredentials({ refresh_token: refreshToken });
  attachRefreshTokenPersistence(client, userSub, "drive");
  const isReady = await ensureAccessToken(client, "drive");
  if (!isReady) return null;
  return client;
}

export async function getOAuth2ClientForMailUser(
  userSub: string,
): Promise<OAuth2Client | null> {
  const pool = getPool();
  if (!pool) {
    return null;
  }
  const { rows } = await pool.query<{ refresh_token_encrypted: string }>(
    `SELECT refresh_token_encrypted FROM google_mail_connections WHERE user_sub = $1`,
    [userSub],
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const refreshToken = decryptToken(row.refresh_token_encrypted);
  const client = createOAuth2Client("mail");
  client.setCredentials({ refresh_token: refreshToken });
  attachRefreshTokenPersistence(client, userSub, "mail");
  const isReady = await ensureAccessToken(client, "mail");
  if (!isReady) return null;
  return client;
}

export async function fetchDriveAboutEmail(
  auth: OAuth2Client,
): Promise<string | null> {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.about.get({ fields: "user(emailAddress)" });
  const email = res.data.user?.emailAddress;
  return typeof email === "string" ? email : null;
}

export async function fetchGmailProfileEmail(
  auth: OAuth2Client,
): Promise<string | null> {
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.getProfile({ userId: "me" });
  const email = res.data.emailAddress;
  return typeof email === "string" ? email : null;
}

export async function downloadDriveFile(
  auth: OAuth2Client,
  fileId: string,
  mime: string,
): Promise<Buffer> {
  const drive = google.drive({ version: "v3", auth });

  if (mime === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "arraybuffer" },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}
