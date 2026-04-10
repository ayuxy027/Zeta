import { authConfig } from '../auth/config';

const withBackend = (path: string) => `${authConfig.backendUrl}${path}`;

export type MailConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
};

export type MailMessageRow = {
  id: string;
  threadId: string | null;
  snippet: string | null;
  subject: string | null;
  from: string | null;
  date: string | null;
};

export type MailListResponse = {
  messages: MailMessageRow[];
  nextPageToken: string | null;
  resultSizeEstimate: number | null;
};

export async function fetchMailConnectionStatus(): Promise<MailConnectionStatus> {
  const response = await fetch(withBackend('/api/integrations/google-mail/status'), {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<MailConnectionStatus>;
}

export async function fetchMailMessages(options: {
  q?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<MailListResponse> {
  const params = new URLSearchParams();
  if (options.q?.trim()) {
    params.set('q', options.q.trim());
  }
  if (options.maxResults != null) {
    params.set('maxResults', String(options.maxResults));
  }
  if (options.pageToken) {
    params.set('pageToken', options.pageToken);
  }
  const qs = params.toString();
  const url = `${withBackend('/api/mail/messages')}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<MailListResponse>;
}

export async function disconnectGoogleMail(): Promise<void> {
  const response = await fetch(withBackend('/api/integrations/google-mail/disconnect'), {
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

export function getGoogleMailAuthUrl(): string {
  return withBackend('/api/integrations/google-mail/auth');
}
