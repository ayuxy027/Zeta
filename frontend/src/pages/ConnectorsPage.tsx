import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link2, Unlink } from 'lucide-react';
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

  React.useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [banner]);

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
    <div className="min-h-screen bg-vintage-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Subtly Aesthetic Background (Connecting Lines + Grid) restricted to screen edges */}
      <div className="absolute inset-0 pointer-events-none z-0 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_100%)] opacity-70">
        
        {/* Architectural Grid */}
        <div 
          className="absolute inset-0 opacity-[0.04]" 
          style={{
            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
            backgroundSize: '100px 100px',
            backgroundPosition: 'center top'
          }}
        />

        {/* Aesthetic Flight/Network Lines overlay */}
        <svg className="absolute w-full h-full opacity-[0.06]" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M -10 15 C 20 5, 70 30, 110 20" stroke="currentColor" strokeWidth="0.2" fill="none" strokeDasharray="1 1" className="text-gray-900" />
          <path d="M -10 85 C 30 70, 60 95, 110 80" stroke="currentColor" strokeWidth="0.15" fill="none" strokeDasharray="2 1" className="text-gray-900" />
          <path d="M 15 -10 C 10 30, 30 70, 20 110" stroke="currentColor" strokeWidth="0.15" fill="none" strokeDasharray="0.5 1" className="text-gray-900" />
          <path d="M 85 -10 C 90 40, 70 60, 80 110" stroke="currentColor" strokeWidth="0.2" fill="none" strokeDasharray="1 2" className="text-gray-900" />
        </svg>

        {/* Ambient technological corner glows */}
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[50%] bg-indigo-500/10 rounded-full blur-[140px] mix-blend-multiply" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[50%] bg-emerald-500/10 rounded-full blur-[140px] mix-blend-multiply" />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10 mt-16 md:mt-10">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-vintage-black">Connectors</h1>
          <p className="text-vintage-gray-600 mt-2 max-w-2xl">
            Connect your Google Workspace and Slack accounts to enable integrations across your tools.
          </p>
        </div>

        {banner && (
          <div
            className={`relative overflow-hidden rounded-xl border px-4 py-3.5 text-sm shadow-sm ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <span className="font-semibold">{banner.message}</span>
              <button
                type="button"
                className="ml-3 text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => setBanner(null)}
              >
                Dismiss
              </button>
            </div>
            {/* Reverse loader line */}
            <div 
               className={`absolute bottom-0 left-0 h-1 w-full ${
                 banner.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'
               }`} 
               style={{ animation: 'deplete 3s linear forwards' }}
            />
            <style>{`
              @keyframes deplete {
                0% { width: 100%; }
                100% { width: 0%; }
              }
            `}</style>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        )}

        {/* ── Google Workspace Card ─────────────────────────────────────── */}
        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-indigo-100/10 overflow-hidden transition-all duration-300 hover:shadow-indigo-100/30">
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-vintage-black tracking-tight">Google Workspace</h2>
                <p className="text-sm text-vintage-gray-500 mt-1.5 max-w-md leading-relaxed">
                  Connect your Google Workspace account to enable automatic data ingestion from Gmail, Calendar, and Drive.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex justify-end">
              {googleLoading ? (
                <div className="h-12 w-32 bg-gray-100 rounded-full animate-pulse"></div>
              ) : googleStatus?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-600 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <Unlink className="w-4 h-4" aria-hidden />
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-blue-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Link2 className="w-4 h-4" aria-hidden />
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Connected State Dashboard panel */}
          {!googleLoading && googleStatus?.connected && (
            <div className="bg-gray-50/50 p-4 md:px-8 md:py-5 border-t border-gray-100">
              <div className="flex flex-row items-center gap-5 overflow-x-auto no-scrollbar py-1">
                
                {/* Connection Status & Email */}
                {googleStatus.email && (
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-gray-900 font-medium text-sm">{googleStatus.email}</p>
                  </div>
                )}

                <div className="w-px h-8 bg-gray-200 shrink-0 hidden md:block"></div>

                {/* Scopes Cards */}
                <div className="flex flex-row items-center gap-3 shrink-0">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105">
                    <img src="/assets/icons/gmail-svgrepo-com.svg" className="w-5 h-5 object-contain" alt="Gmail" />
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none mb-1">Connected</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">Gmail</span>
                    </div>
                    <svg className="w-4 h-4 text-emerald-600 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105">
                    <img src="/assets/icons/drive-color-svgrepo-com.svg" className="w-5 h-5 object-contain" alt="Drive" />
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none mb-1">Connected</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">Drive</span>
                    </div>
                    <svg className="w-4 h-4 text-emerald-600 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>

                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-500"><path d="M19 4h-1V3a1 1 0 00-2 0v1H8V3a1 1 0 00-2 0v1H5a3 3 0 00-3 3v12a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zm1 15a1 1 0 01-1 1H5a1 1 0 01-1-1v-8h16v8zm0-10H4V7a1 1 0 011-1h14a1 1 0 011 1v2z"/></svg>
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none mb-1">Connected</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">Calendar</span>
                    </div>
                    <svg className="w-4 h-4 text-emerald-600 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Slack Card ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-lg shadow-indigo-100/10 overflow-hidden transition-all duration-300 hover:shadow-indigo-100/30">
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#4A154B]/10 flex items-center justify-center shrink-0 border border-[#4A154B]/20">
                <img src="/assets/icons/slack-svgrepo-com.svg" className="w-8 h-8 object-contain" alt="Slack" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-vintage-black tracking-tight">Slack</h2>
                <p className="text-sm text-vintage-gray-500 mt-1.5 max-w-md leading-relaxed">
                  Connect your Slack workspace to enable real-time messaging, channels monitoring, and alerts.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex justify-end">
              {slackLoading ? (
                <div className="h-12 w-32 bg-gray-100 rounded-full animate-pulse"></div>
              ) : slackStatus?.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnectSlack}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-600 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                >
                  <Unlink className="w-4 h-4" aria-hidden />
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectSlack}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-[#4A154B] text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-[#3b113b] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Link2 className="w-4 h-4" aria-hidden />
                  Connect
                </button>
              )}
            </div>
          </div>

          {/* Connected State Dashboard panel */}
          {!slackLoading && slackStatus?.connected && (
            <div className="bg-gray-50/50 p-4 md:px-8 md:py-5 border-t border-gray-100">
              <div className="flex flex-row items-center gap-5 overflow-x-auto no-scrollbar py-1">
                
                {/* Connection Status & Team Name */}
                {slackStatus.teamName && (
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-gray-900 font-medium text-sm">{slackStatus.teamName}</p>
                  </div>
                )}

                <div className="w-px h-8 bg-gray-200 shrink-0 hidden md:block"></div>

                {/* Scopes Cards */}
                <div className="flex flex-row items-center gap-3 shrink-0">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none mb-1">Streaming</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">Channels</span>
                    </div>
                    <span className="relative flex h-2 w-2 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shadow-sm transition-transform hover:scale-105">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    <div className="flex flex-col pr-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none mb-1">Listening</span>
                      <span className="text-sm font-bold text-gray-900 leading-none">Alerts</span>
                    </div>
                    <span className="relative flex h-2 w-2 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>
      </div>
      </main>
    </div>
  );
};

export default ConnectorsPage;
