import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { decryptToken } from "../lib/tokenCrypto.js";
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
