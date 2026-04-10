import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Unlink } from 'lucide-react';
import {
  disconnectGoogleMail,
  fetchMailConnectionStatus,
  fetchMailMessages,
  getGoogleMailAuthUrl,
  type MailMessageRow,
} from '../api/mail';

const MailPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = React.useState<{ connected: boolean; googleEmail: string | null } | null>(null);
  const [query, setQuery] = React.useState('');
  const [messages, setMessages] = React.useState<MailMessageRow[]>([]);
  const [nextPageToken, setNextPageToken] = React.useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);
  const [loadingList, setLoadingList] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const runFetch = React.useCallback(
    async (opts: { q: string; pageToken?: string | null; append?: boolean }) => {
      setLoadingList(true);
      setError(null);
      try {
        const q = opts.q.trim();
        const data = await fetchMailMessages({
          maxResults: 20,
          ...(q ? { q } : {}),
          ...(opts.pageToken ? { pageToken: opts.pageToken } : {}),
        });
        setNextPageToken(data.nextPageToken);
        if (opts.append) {
          setMessages((prev) => [...prev, ...data.messages]);
        } else {
          setMessages(data.messages);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load messages.');
      } finally {
        setLoadingList(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  React.useEffect(() => {
    const connected = searchParams.get('connected');
    const err = searchParams.get('error');
    if (connected === '1') {
      setBanner({ type: 'success', message: 'Gmail connected. You can search your inbox below.' });
      setSearchParams({}, { replace: true });
    } else if (err) {
      setBanner({ type: 'error', message: `Gmail connection failed: ${decodeURIComponent(err)}` });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const didInitialFetch = React.useRef(false);

  React.useEffect(() => {
    if (!status?.connected) {
      setMessages([]);
      setNextPageToken(null);
      didInitialFetch.current = false;
      return;
    }
    if (!didInitialFetch.current) {
      didInitialFetch.current = true;
      void runFetch({ q: '' });
    }
  }, [status?.connected, runFetch]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void runFetch({ q: query });
  };

  const handleLoadMore = () => {
    if (!nextPageToken) {
      return;
    }
    void runFetch({ q: query, pageToken: nextPageToken, append: true });
  };

  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
            <Mail className="w-8 h-8 text-indigo-600" aria-hidden />
            Mail
          </h1>
          <p className="text-vintage-gray-600 mt-2 max-w-2xl">
            Connect a Google account with read-only Gmail access, then search and browse messages using Gmail’s query syntax (e.g.{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">is:unread</code>,{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">from:alice@example.com</code>
            ).
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vintage-black">Connection</h2>
          {loadingStatus ? (
            <p className="text-vintage-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Checking Gmail connection…
            </p>
          ) : status?.connected ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-vintage-gray-700">
                Connected
                {status.googleEmail ? (
                  <span className="font-medium text-vintage-black"> — {status.googleEmail}</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50"
              >
                <Unlink className="w-4 h-4" aria-hidden />
                Disconnect Gmail
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-vintage-gray-700">
                Connect Google with read-only Gmail access. You’ll be asked to approve the Gmail scope separately from Drive.
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
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2">
                <label htmlFor="mail-q" className="block text-sm font-medium text-vintage-gray-800">
                  Gmail search
                </label>
                <input
                  id="mail-q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. is:unread newer_than:7d"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-vintage-gray-500">
                  Uses the same{' '}
                  <a
                    href="https://support.google.com/mail/answer/7190"
                    className="text-indigo-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gmail search operators
                  </a>
                  . Leave empty to list recent messages.
                </p>
              </div>
              <button
                type="submit"
                disabled={loadingList}
                className="shrink-0 bg-vintage-black text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loadingList && messages.length === 0 ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Loading…
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </form>

            {loadingList && messages.length === 0 ? (
              <p className="text-vintage-gray-600 flex items-center gap-2 py-8">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Loading messages…
              </p>
            ) : messages.length === 0 ? (
              <p className="text-vintage-gray-600 py-6">No messages matched. Try a different query or clear the search for recent mail.</p>
            ) : (
              <div className="space-y-3">
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 max-h-[520px] overflow-auto">
                  {messages.map((m) => (
                    <li key={m.id} className="px-4 py-3 hover:bg-gray-50/80">
                      <p className="font-medium text-vintage-black text-sm">{m.subject ?? '(No subject)'}</p>
                      <p className="text-xs text-vintage-gray-500 mt-0.5">{m.from ?? '—'}</p>
                      {m.date ? <p className="text-xs text-vintage-gray-400 mt-0.5">{m.date}</p> : null}
                      {m.snippet ? (
                        <p className="text-sm text-vintage-gray-600 mt-2 line-clamp-3">{m.snippet}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {nextPageToken ? (
                  <button
                    type="button"
                    disabled={loadingList}
                    onClick={handleLoadMore}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                  >
                    {loadingList ? 'Loading…' : 'Load more'}
                  </button>
                ) : null}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default MailPage;
