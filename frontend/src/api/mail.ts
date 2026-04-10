import { authConfig } from '../auth/config';

const withBackend = (path: string) => `${authConfig.backendUrl}${path}`;

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  return body.error ?? `HTTP ${response.status}`;
}

export type MailConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
};

export type MailLabel = {
  id: string;
  name: string;
  type?: string;
};

export type MailMessageRow = {
  id: string;
  threadId: string | null;
  snippet: string | null;
  subject: string | null;
  from: string | null;
  date: string | null;
  labelIds: string[];
};

export type MailMessageDetail = {
  id: string;
  threadId: string | null;
  snippet: string | null;
  subject: string | null;
  from: string | null;
  to: string | null;
  date: string | null;
  labelIds: string[];
  bodyText: string;
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
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<MailConnectionStatus>;
}

export async function fetchMailLabels(): Promise<MailLabel[]> {
  const response = await fetch(withBackend('/api/mail/labels'), {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const data = (await response.json()) as { labels: MailLabel[] };
  return data.labels;
}

export async function fetchMailMessages(options: {
  q?: string;
  maxResults?: number;
  pageToken?: string;
  labelId?: string;
  includeSpamTrash?: boolean;
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
  if (options.labelId) {
    params.set('labelId', options.labelId);
  }
  if (options.includeSpamTrash) {
    params.set('includeSpamTrash', 'true');
  }
  const qs = params.toString();
  const url = `${withBackend('/api/mail/messages')}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<MailListResponse>;
}

export async function fetchMailMessage(messageId: string): Promise<MailMessageDetail> {
  const response = await fetch(
    withBackend(`/api/mail/messages/${encodeURIComponent(messageId)}`),
    {
      credentials: 'include',
    },
  );
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<MailMessageDetail>;
}

export async function disconnectGoogleMail(): Promise<void> {
  const response = await fetch(withBackend('/api/integrations/google-mail/disconnect'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export function getGoogleMailAuthUrl(): string {
  return withBackend('/api/integrations/google-mail/auth');
}
