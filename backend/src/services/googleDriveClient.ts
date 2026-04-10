import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { decryptToken } from '../lib/tokenCrypto.js';
import { getPool } from '../db/pool.js';

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const backendBase = process.env.AUTH0_BASE_URL?.trim() ?? process.env.BACKEND_PUBLIC_URL?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ??
    (backendBase ? `${backendBase.replace(/\/$/, '')}/api/integrations/google/callback` : undefined);
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or redirect URI (set GOOGLE_REDIRECT_URI or AUTH0_BASE_URL).',
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function createOAuth2Client(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();
  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export async function getOAuth2ClientForUser(userSub: string): Promise<OAuth2Client | null> {
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
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function fetchDriveAboutEmail(auth: OAuth2Client): Promise<string | null> {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.about.get({ fields: 'user(emailAddress)' });
  const email = res.data.user?.emailAddress;
  return typeof email === 'string' ? email : null;
}

export async function downloadDriveFile(
  auth: OAuth2Client,
  fileId: string,
  mime: string,
): Promise<Buffer> {
  const drive = google.drive({ version: 'v3', auth });

  if (mime === 'application/vnd.google-apps.document') {
    const res = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'arraybuffer' },
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data as ArrayBuffer);
}
