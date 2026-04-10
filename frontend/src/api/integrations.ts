import { authConfig } from '../auth/config';

const withBackend = (path: string) => `${authConfig.backendUrl}${path}`;

// ── Google Workspace ─────────────────────────────────────────────────────────

export type GoogleWorkspaceStatus = {
  connected: boolean;
  email: string | null;
  scopes: string | null;
  connectedAt: string | null;
};

export async function fetchGoogleWorkspaceStatus(): Promise<GoogleWorkspaceStatus> {
  const response = await fetch(withBackend('/api/integrations/google-workspace/status'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<GoogleWorkspaceStatus>;
}

export async function disconnectGoogleWorkspace(): Promise<void> {
  const response = await fetch(withBackend('/api/integrations/google-workspace/disconnect'), {
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

export function getGoogleWorkspaceAuthUrl(): string {
  return withBackend('/api/integrations/google-workspace/auth');
}

// ── Slack ────────────────────────────────────────────────────────────────────

export type SlackStatus = {
  connected: boolean;
  teamId: string | null;
  teamName: string | null;
  scopes: string | null;
  connectedAt: string | null;
};

export async function fetchSlackStatus(): Promise<SlackStatus> {
  const response = await fetch(withBackend('/api/integrations/slack/status'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<SlackStatus>;
}

export async function disconnectSlack(): Promise<void> {
  const response = await fetch(withBackend('/api/integrations/slack/disconnect'), {
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

export function getSlackAuthUrl(): string {
  return withBackend('/api/integrations/slack/auth');
}
