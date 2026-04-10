import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Link2, Unlink } from 'lucide-react';
import {
  fetchGoogleWorkspaceStatus,
  disconnectGoogleWorkspace,
  getGoogleWorkspaceAuthUrl,
  type GoogleWorkspaceStatus,
  fetchSlackStatus,
  disconnectSlack,
  getSlackAuthUrl,
  type SlackStatus,
} from '../api/integrations';

const ConnectorsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [googleStatus, setGoogleStatus] = React.useState<GoogleWorkspaceStatus | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(true);

  const [slackStatus, setSlackStatus] = React.useState<SlackStatus | null>(null);
  const [slackLoading, setSlackLoading] = React.useState(true);

  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Load statuses ────────────────────────────────────────────────────────

  const loadGoogleStatus = React.useCallback(async () => {
    setGoogleLoading(true);
    try {
      const s = await fetchGoogleWorkspaceStatus();
      setGoogleStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Google Workspace status.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const loadSlackStatus = React.useCallback(async () => {
    setSlackLoading(true);
    try {
      const s = await fetchSlackStatus();
      setSlackStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Slack status.');
    } finally {
      setSlackLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadGoogleStatus();
    void loadSlackStatus();
  }, [loadGoogleStatus, loadSlackStatus]);

  // ── Handle OAuth callback params ─────────────────────────────────────────

  React.useEffect(() => {
    const gwConnected = searchParams.get('google_workspace_connected');
    const slackConnected = searchParams.get('slack_connected');
    const err = searchParams.get('error');

    if (gwConnected === '1') {
      setBanner({ type: 'success', message: 'Google Workspace connected successfully.' });
      void loadGoogleStatus();
    } else if (slackConnected === '1') {
      setBanner({ type: 'success', message: 'Slack connected successfully.' });
      void loadSlackStatus();
    } else if (err) {
      setBanner({ type: 'error', message: `Connection failed: ${decodeURIComponent(err)}` });
    }

    if (gwConnected || slackConnected || err) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadGoogleStatus, loadSlackStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnectGoogle = () => {
    window.location.href = getGoogleWorkspaceAuthUrl();
  };

  const handleDisconnectGoogle = async () => {
    setError(null);
    try {
      await disconnectGoogleWorkspace();
      setGoogleStatus({ connected: false, email: null, scopes: null, connectedAt: null });
      setBanner({ type: 'success', message: 'Google Workspace disconnected.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect Google Workspace.');
    }
  };

  const handleConnectSlack = () => {
    window.location.href = getSlackAuthUrl();
  };

  const handleDisconnectSlack = async () => {
    setError(null);
    try {
      await disconnectSlack();
      setSlackStatus({ connected: false, teamId: null, teamName: null, scopes: null, connectedAt: null });
      setBanner({ type: 'success', message: 'Slack disconnected.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect Slack.');
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-vintage-black">Connectors</h1>
          <p className="text-vintage-gray-600 mt-2 max-w-2xl">
            Connect your Google Workspace and Slack accounts to enable integrations across your tools.
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
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        )}

        {/* ── Google Workspace Card ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-vintage-black">Google Workspace</h2>
              <p className="text-sm text-vintage-gray-500">Gmail, Calendar, Contacts & more</p>
            </div>
          </div>

          {googleLoading ? (
            <p className="text-vintage-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Checking connection status…
            </p>
          ) : googleStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-vintage-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Connected
                </span>
                {googleStatus.email && (
                  <span className="font-medium text-vintage-black">— {googleStatus.email}</span>
                )}
              </div>
              {googleStatus.scopes && (
                <p className="text-xs text-vintage-gray-500 break-all">
                  Scopes: {googleStatus.scopes}
                </p>
              )}
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50"
              >
                <Unlink className="w-4 h-4" aria-hidden />
                Disconnect Google Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-vintage-gray-700 text-sm">
                Connect your Google Workspace account to enable Gmail, Calendar, and Contacts integrations.
              </p>
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition"
              >
                <Link2 className="w-4 h-4" aria-hidden />
                Connect Google Workspace
              </button>
            </div>
          )}
        </section>

        {/* ── Slack Card ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
                <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-vintage-black">Slack</h2>
              <p className="text-sm text-vintage-gray-500">Channels, messages & team info</p>
            </div>
          </div>

          {slackLoading ? (
            <p className="text-vintage-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Checking connection status…
            </p>
          ) : slackStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-vintage-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Connected
                </span>
                {slackStatus.teamName && (
                  <span className="font-medium text-vintage-black">— {slackStatus.teamName}</span>
                )}
              </div>
              {slackStatus.scopes && (
                <p className="text-xs text-vintage-gray-500 break-all">
                  Scopes: {slackStatus.scopes}
                </p>
              )}
              <button
                type="button"
                onClick={handleDisconnectSlack}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-vintage-gray-800 hover:bg-gray-50"
              >
                <Unlink className="w-4 h-4" aria-hidden />
                Disconnect Slack
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-vintage-gray-700 text-sm">
                Connect your Slack workspace to enable message ingestion and channel monitoring.
              </p>
              <button
                type="button"
                onClick={handleConnectSlack}
                className="inline-flex items-center gap-2 bg-purple-700 text-white px-6 py-3 rounded-full font-medium hover:bg-purple-800 transition"
              >
                <Link2 className="w-4 h-4" aria-hidden />
                Connect Slack
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ConnectorsPage;
