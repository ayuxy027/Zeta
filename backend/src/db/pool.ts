import pg from 'pg';
import { normalizeDatabaseUrl } from './dbUrl.js';

let pool: pg.Pool | null = null;

export function getDatabaseUrl(): string | undefined {
  const raw = process.env.DB_URL ?? process.env.DATABASE_URL;
  return normalizeDatabaseUrl(raw);
}

export function getPool(): pg.Pool | null {
  return pool;
}

export async function initDb(): Promise<void> {
  const url = getDatabaseUrl();
  if (!url) {
    console.warn('[db] DB_URL is not set; Google Drive ingest is disabled.');
    return;
  }

  pool = new pg.Pool({
    connectionString: url,
    max: 10,
    ssl: url.includes('neon.tech') || url.includes('sslmode=require') ? { rejectUnauthorized: true } : undefined,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS google_drive_connections (
      user_sub TEXT PRIMARY KEY,
      refresh_token_encrypted TEXT NOT NULL,
      google_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_extractions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_sub TEXT NOT NULL,
      display_name TEXT NOT NULL,
      source_drive_file_ids JSONB NOT NULL,
      sources_json JSONB NOT NULL,
      extracted_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS document_extractions_user_sub_idx
      ON document_extractions (user_sub);

    CREATE TABLE IF NOT EXISTS google_mail_connections (
      user_sub TEXT PRIMARY KEY,
      refresh_token_encrypted TEXT NOT NULL,
      google_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('[db] Migrations applied (google_drive_connections, google_mail_connections, document_extractions).');
}
