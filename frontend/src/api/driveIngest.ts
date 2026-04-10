import { authConfig } from '../auth/config';

const withBackend = (path: string) => `${authConfig.backendUrl}${path}`;

export type DriveConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
};

export type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  size: string | null;
};

export type ExtractionSummary = {
  id: string;
  displayName: string;
  createdAt: string;
  preview: string;
};

export async function fetchDriveConnectionStatus(): Promise<DriveConnectionStatus> {
  const response = await fetch(withBackend('/api/integrations/google/status'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<DriveConnectionStatus>;
}

export async function fetchDriveFiles(): Promise<DriveFileRow[]> {
  const response = await fetch(withBackend('/api/drive/files'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  const data = (await response.json()) as { files: DriveFileRow[] };
  return data.files;
}

export async function disconnectGoogleDrive(): Promise<void> {
  const response = await fetch(withBackend('/api/integrations/google/disconnect'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
}

export async function ingestDriveFiles(fileIds: string[], displayName: string): Promise<{
  id: string;
  displayName: string;
  warnings: string[];
  charCount: number;
}> {
  const response = await fetch(withBackend('/api/ingest/drive'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds, displayName }),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<{
    id: string;
    displayName: string;
    warnings: string[];
    charCount: number;
  }>;
}

export async function fetchExtractions(): Promise<ExtractionSummary[]> {
  const response = await fetch(withBackend('/api/ingest/documents'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  const data = (await response.json()) as { documents: ExtractionSummary[] };
  return data.documents;
}

export function getGoogleDriveAuthUrl(): string {
  return withBackend('/api/integrations/google/auth');
}
