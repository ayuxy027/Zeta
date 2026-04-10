import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Unlink,
} from 'lucide-react';
import {
  disconnectGoogleMail,
  fetchMailConnectionStatus,
  fetchMailLabels,
  fetchMailMessage,
  fetchMailMessages,
  getGoogleMailAuthUrl,
  type MailLabel,
  type MailMessageDetail,
  type MailMessageRow,
} from '../api/mail';

const PRESETS: { label: string; q: string }[] = [
  { label: 'Inbox', q: 'in:inbox' },
  { label: 'Unread', q: 'is:unread' },
  { label: 'Last 7 days', q: 'newer_than:7d' },
  { label: 'Starred', q: 'is:starred' },
  { label: 'All mail', q: '' },
];

function isUnread(row: MailMessageRow): boolean {
  return row.labelIds?.includes('UNREAD') ?? false;
}

function gmailThreadUrl(threadId: string | null): string | null {
  if (!threadId) {
    return null;
  }
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
}

const MailPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = React.useState<{ connected: boolean; googleEmail: string | null } | null>(null);
  const [labels, setLabels] = React.useState<MailLabel[]>([]);
  const [query, setQuery] = React.useState('');
  const [labelFilterId, setLabelFilterId] = React.useState('');
  const [includeSpamTrash, setIncludeSpamTrash] = React.useState(false);
  const [messages, setMessages] = React.useState<MailMessageRow[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [loadingList, setLoadingList] = React.useState(false);
  const [loadingLabels, setLoadingLabels] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<MailMessageDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const s = await fetchMailConnectionStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load mail connection status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadLabels = React.useCallback(async () => {
    setLoadingLabels(true);
    try {
      const list = await fetchMailLabels();
      setLabels(list);
    } catch {
      setLabels([]);
    } finally {
      setLoadingLabels(false);
    }
  }, []);

  const fetchMessages = React.useCallback(
    async (opts: {
      q: string;
      pageToken?: string | null;
      append?: boolean;
      /** When set, overrides `labelFilterId` state for this request (avoids stale closure after dropdown change). */
      labelId?: string;
      includeSpamTrash?: boolean;
    }) => {
      const effLabel =
        opts.labelId !== undefined ? opts.labelId || undefined : labelFilterId || undefined;
      const effSpam =
        opts.includeSpamTrash !== undefined ? opts.includeSpamTrash : includeSpamTrash;

      setLoadingList(true);
      setError(null);
      try {
        const q = opts.q.trim();
        const data = await fetchMailMessages({
          maxResults: 25,
          ...(q ? { q } : {}),
          ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
          ...(effLabel ? { labelId: effLabel } : {}),
          includeSpamTrash: effSpam,
        });
        setNextPageToken(data.nextPageToken);
        if (opts.append) {
          setMessages((prev) => [...prev, ...data.messages]);
        } else {
          setMessages(data.messages);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load messages.';
        setError(msg);
      } finally {
        setLoadingList(false);
      }
    },
    [labelFilterId, includeSpamTrash],
  );

  const didInitialFetch = React.useRef(false);

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  React.useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    if (connected === '1') {
      setBanner({ type: 'success', message: 'Gmail connected. Your inbox will load below.' });
      didInitialFetch.current = false;
      void loadStatus();
      void loadLabels();
      setSearchParams({}, { replace: true });
    } else if (err) {
      const decoded = decodeURIComponent(err);
      const friendly =
        decoded === 'no_refresh_token'
          ? 'Google did not return a refresh token. Disconnect any existing Gmail connection in Google Account settings and try again, or revoke app access once and reconnect.'
          : decoded;
      setBanner({ type: 'error', message: `Gmail connection failed: ${friendly}` });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadStatus, loadLabels]);

  React.useEffect(() => {
    if (!status?.connected) {
      setMessages([]);
      setNextPageToken(null);
      setLabels([]);
      setSelectedId(null);
      setDetail(null);
      didInitialFetch.current = false;
      return;
    }
    void loadLabels();
    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      void fetchMessages({ q: '' });
    }
  }, [status?.connected, fetchMessages, loadLabels]);

  React.useEffect(() => {
    if (!selectedId || !status?.connected) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void fetchMailMessage(selectedId)
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(e instanceof Error ? e.message : 'Could not load message.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, status?.connected]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleConnect = () => {
    window.location.href = getGoogleMailAuthUrl();
  };

  const handleDisconnect = async () => {
    setError(null);
    try {
      await disconnectGoogleMail();
      setStatus({ connected: false, googleEmail: null });
      setMessages([]);
      setNextPageToken(null);
      setSelectedId(null);
      setDetail(null);
      setLabels([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedId(null);
    void fetchMessages({ q: query });
  };

  const handleLoadMore = () => {
    if (!nextPageToken) {
      return;
    }
    void fetchMessages({ q: query, pageToken: nextPageToken, append: true });
  };

  const applyPreset = (q: string) => {
    setQuery(q);
    setSelectedId(null);
    void fetchMessages({ q });
  };

  const handleRefresh = () => {
    setSelectedId(null);
    void fetchMessages({ q: query });
  };

  const needsReconnect =
    error?.toLowerCase().includes('disconnect and connect') ||
    error?.toLowerCase().includes('revoked');

  return (
    <div className="min-h-screen bg-vintage-white pt-20 pb-16">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
            <Mail className="w-8 h-8 text-indigo-600" aria-hidden />
            Mail
          </h1>
          <p className="text-vintage-gray-600 mt-2 max-w-3xl text-sm sm:text-base leading-relaxed">
            Read-only Gmail: connect once, search with Gmail operators, open threads in Gmail, and read full message bodies here.
            This is separate from Google Drive OAuth — you may see a second consent screen for the Gmail scope.
          </p>
        </div>

        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {banner.message}
            <button type="button" className="ml-3 underline" onClick={() => setBanner(null)}>
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 space-y-2">
            <p>{error}</p>
            {needsReconnect ? (
              <button
                type="button"
                onClick={handleConnect}
                className="text-indigo-700 font-medium underline"
              >
                Reconnect Gmail
              </button>
            ) : null}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vintage-black">Connection</h2>
          {loadingStatus ? (
            <p className="text-vintage-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Checking Gmail connection…
            </p>
          ) : status?.connected ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-vintage-gray-700">
                Connected
                {status.googleEmail ? (
                  <span className="font-medium text-vintage-black"> — {status.googleEmail}</span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleRefresh();
                    void loadLabels();
                  }}
                  disabled={loadingList}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} aria-hidden />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50"
                >
                  <Unlink className="w-4 h-4" aria-hidden />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-vintage-gray-700 text-sm">
                Uses scope <code className="text-xs bg-gray-100 px-1 rounded">gmail.readonly</code>. Add the redirect URI{' '}
                <code className="text-xs bg-gray-100 px-1 rounded break-all">/api/integrations/google-mail/callback</code> to your Google Cloud OAuth client.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                className="bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition"
              >
                Connect Gmail
              </button>
            </div>
          )}
        </section>

        {status?.connected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
              <div className="flex flex-col gap-4">
                <form onSubmit={handleSearch} className="space-y-3">
                  <label htmlFor="mail-q" className="block text-sm font-medium text-vintage-gray-800">
                    Search
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
                      <input
                        id="mail-q"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. is:unread newer_than:7d from:me"
                        className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoComplete="off"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loadingList}
                      className="shrink-0 bg-vintage-black text-white px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {loadingList && messages.length === 0 ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                          Loading
                        </>
                      ) : (
                        'Run'
                      )}
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.q)}
                      disabled={loadingList}
                      className="text-xs sm:text-sm rounded-full border border-gray-200 px-3 py-1.5 text-vintage-gray-800 hover:bg-gray-50 hover:border-indigo-200 transition disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Inbox className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
                    <select
                      value={labelFilterId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLabelFilterId(v);
                        setSelectedId(null);
                        void fetchMessages({ q: query, labelId: v });
                      }}
                      disabled={loadingList || loadingLabels}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      aria-label="Filter by Gmail label"
                    >
                      <option value="">All labels (use search)</option>
                      {labels.slice(0, 100).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.type === 'system' ? `[${l.name}]` : l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-vintage-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSpamTrash}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setIncludeSpamTrash(next);
                        setSelectedId(null);
                        void fetchMessages({ q: query, includeSpamTrash: next });
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Include Spam &amp; Trash
                  </label>
                </div>

                <p className="text-xs text-vintage-gray-500">
                  Gmail{' '}
                  <a
                    href="https://support.google.com/mail/answer/7190"
                    className="text-indigo-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    search operators
                  </a>
                  . Press Esc to close the message panel.
                </p>
              </div>

              {loadingList && messages.length === 0 ? (
                <p className="text-vintage-gray-600 flex items-center gap-2 py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-hidden />
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-vintage-gray-600 py-8 text-sm">
                  No messages matched. Try another search, pick a label, or clear filters.
                </p>
              ) : (
                <div className="space-y-2">
                  <ul
                    className="max-h-[min(520px,55vh)] overflow-auto rounded-xl border border-gray-100 divide-y divide-gray-100"
                    role="listbox"
                    aria-label="Message list"
                  >
                    {messages.map((m) => {
                      const active = selectedId === m.id;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => setSelectedId(m.id)}
                            className={`w-full text-left px-4 py-3 transition ${
                              active
                                ? 'bg-indigo-50 border-l-4 border-indigo-600 pl-3'
                                : 'hover:bg-gray-50/90 border-l-4 border-transparent pl-3'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-vintage-black text-sm line-clamp-2">
                                {m.subject ?? '(No subject)'}
                              </p>
                              {isUnread(m) ? (
                                <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-vintage-gray-500 mt-0.5 line-clamp-1">{m.from ?? '—'}</p>
                            {m.date ? (
                              <p className="text-[11px] text-vintage-gray-400 mt-0.5">{m.date}</p>
                            ) : null}
                            {m.snippet ? (
                              <p className="text-sm text-vintage-gray-600 mt-2 line-clamp-2">{m.snippet}</p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {nextPageToken ? (
                    <button
                      type="button"
                      disabled={loadingList}
                      onClick={handleLoadMore}
                      className="w-full sm:w-auto text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 py-2"
                    >
                      {loadingList ? 'Loading…' : 'Load more'}
                    </button>
                  ) : null}
                </div>
              )}
            </section>

            <section
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 min-h-[min(560px,60vh)] lg:sticky lg:top-24 flex flex-col"
              aria-live="polite"
            >
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-vintage-gray-500 py-12 px-4">
                  <Mail className="w-12 h-12 text-gray-300 mb-3" aria-hidden />
                  <p className="text-sm">Select a message to read the full body.</p>
                </div>
              ) : detailLoading ? (
                <div className="flex-1 flex items-center justify-center gap-2 text-vintage-gray-600 py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" aria-hidden />
                  Opening message…
                </div>
              ) : detailError ? (
                <div className="text-sm text-red-800 space-y-2">
                  <p>{detailError}</p>
                  <button type="button" className="text-indigo-600 underline" onClick={() => setSelectedId(null)}>
                    Close
                  </button>
                </div>
              ) : detail ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-vintage-black leading-snug">
                        {detail.subject ?? '(No subject)'}
                      </h2>
                      <p className="text-xs text-vintage-gray-500 mt-1">
                        {detail.date ?? '—'}
                      </p>
                    </div>
                    {gmailThreadUrl(detail.threadId) ? (
                      <a
                        href={gmailThreadUrl(detail.threadId)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 shrink-0"
                      >
                        Open in Gmail
                        <ExternalLink className="w-4 h-4" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  <dl className="grid gap-2 text-sm mt-4">
                    <div>
                      <dt className="text-xs font-medium text-vintage-gray-500">From</dt>
                      <dd className="text-vintage-gray-900 break-words">{detail.from ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-vintage-gray-500">To</dt>
                      <dd className="text-vintage-gray-900 break-words">{detail.to ?? '—'}</dd>
                    </div>
                  </dl>
                  <div className="flex-1 min-h-0 mt-4 overflow-auto rounded-xl bg-gray-50/80 border border-gray-100 p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-vintage-gray-800 leading-relaxed">
                      {detail.bodyText?.trim()
                        ? detail.bodyText
                        : detail.snippet ?? 'No body text could be extracted for this message (try Open in Gmail).'}
                    </pre>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default MailPage;
