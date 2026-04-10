import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Link2, Unlink, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useSyncContext, pipelineCache, type SyncStep } from '../context/SyncContext';

// ── Sub-messages per data source ───────────────────────────────────────────
const SUB_MSGS: Record<string, string[]> = {
  Gmail:    ['Fetching inbox…', 'Scanning threads…', 'Indexing labels…', 'Reading attachments…', 'Parsing drafts…'],
  Drive:    ['Scanning files…', 'Indexing docs…', 'Reading metadata…', 'Processing folders…', 'Syncing revisions…'],
  Calendar: ['Fetching events…', 'Syncing meetings…', 'Reading invites…', 'Processing recurrence…'],
  Channels: ['Fetching history…', 'Indexing threads…', 'Scanning members…', 'Reading reactions…'],
  Alerts:   ['Subscribing…', 'Configuring hooks…', 'Testing connection…', 'Activating listeners…'],
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ── Sub-message cycling hook ───────────────────────────────────────────────
function useSubMsg(label: string, active: boolean): string {
  const msgs = SUB_MSGS[label] ?? ['Syncing…'];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % msgs.length);
        schedule();
      }, rand(900, 1800));
    };
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, label]);

  return msgs[idx] ?? msgs[0] ?? 'Syncing…';
}

// ── Single step row ────────────────────────────────────────────────────────
interface StepRowProps { step: SyncStep; accent: { bg: string; border: string; text: string; bar: string }; }

const StepRow: React.FC<StepRowProps> = ({ step, accent }) => {
  const subMsg = useSubMsg(step.label, step.state === 'syncing');
  const isSyncing = step.state === 'syncing';
  const isDone    = step.state === 'done';

  return (
    <motion.div
      layout
      animate={{
        scale: isSyncing ? 1.018 : 1,
        opacity: step.state === 'pending' ? 0.45 : 1,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className="relative flex items-center gap-3 rounded-xl px-4 py-3 border overflow-hidden"
      style={{
        background: isSyncing ? accent.bg : isDone ? 'rgba(236,253,245,0.7)' : '#f9fafb',
        borderColor: isSyncing ? accent.border : isDone ? '#a7f3d0' : '#f3f4f6',
        boxShadow: isSyncing ? `0 2px 12px 0 ${accent.border}55` : 'none',
      }}
    >
      {/* Dot / Spinner / Check */}
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {isSyncing ? (
          <span className="flex gap-[3px] items-end">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-[4px] rounded-full"
                style={{ backgroundColor: accent.text }}
                animate={{ height: ['4px', '12px', '4px'] }}
                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </span>
        ) : isDone ? (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="w-4 h-4"
            viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={3}
          >
            <motion.path
              strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </motion.svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-gray-300 block" />
        )}
      </div>

      {/* Label + sub-message */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: isSyncing ? accent.text : isDone ? '#065f46' : '#9ca3af' }}
        >
          {step.label}
        </span>
        <AnimatePresence mode="wait">
          {isSyncing && (
            <motion.p
              key={subMsg}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-[10px] font-medium mt-0.5"
              style={{ color: accent.text, opacity: 0.75 }}
            >
              {subMsg}
            </motion.p>
          )}
          {isDone && (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-medium text-emerald-600 mt-0.5"
            >
              Complete
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Percentage badge */}
      <AnimatePresence>
        {isSyncing && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-[11px] font-bold tabular-nums shrink-0"
            style={{ color: accent.text }}
          >
            {Math.round(step.progress * 100)}%
          </motion.span>
        )}
        {isDone && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] font-bold text-emerald-600 shrink-0"
          >
            ✓ Synced
          </motion.span>
        )}
      </AnimatePresence>

      {/* Bottom progress bar */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-xl"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent.border}, ${accent.text}, ${accent.border})`, backgroundSize: '200% 100%' }}
              initial={{ width: '0%' }}
              animate={{ width: `${step.progress * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Connector status localStorage cache ────────────────────────────────────
const STATUS_LS_KEY = 'zeta_connector_status';

function _readStatusCache(): { google: GoogleWorkspaceStatus | null; slack: SlackStatus | null } {
  try { const r = localStorage.getItem(STATUS_LS_KEY); return r ? JSON.parse(r) : { google: null, slack: null }; }
  catch { return { google: null, slack: null }; }
}
function _writeStatusCache(google: GoogleWorkspaceStatus | null, slack: SlackStatus | null) {
  try { localStorage.setItem(STATUS_LS_KEY, JSON.stringify({ google, slack })); } catch { /* */ }
}
const _initStatus = _readStatusCache();
let cachedGoogleStatus: GoogleWorkspaceStatus | null = _initStatus.google;
let cachedSlackStatus: SlackStatus | null = _initStatus.slack;

// ──────────────────────────────────────────────────────────────────────────

const ConnectorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    googleSteps, slackSteps,
    startGoogle, startSlack,
    stopGoogle, stopSlack,
    activateGoogle, activateSlack,
    isAnySyncing,
  } = useSyncContext();

  const [googleStatus, setGoogleStatus] = React.useState<GoogleWorkspaceStatus | null>(cachedGoogleStatus);
  const [googleLoading, setGoogleLoading] = React.useState(!cachedGoogleStatus);

  const [slackStatus, setSlackStatus] = React.useState<SlackStatus | null>(cachedSlackStatus);
  const [slackLoading, setSlackLoading] = React.useState(!cachedSlackStatus);

  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  React.useEffect(() => {
    if (banner) {
      const timer = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [banner]);

  // ── Load statuses ────────────────────────────────────────────────────────

  const loadGoogleStatus = React.useCallback(async () => {
    if (!cachedGoogleStatus) setGoogleLoading(true);
    try {
      const s = await fetchGoogleWorkspaceStatus();
      cachedGoogleStatus = s;
      _writeStatusCache(cachedGoogleStatus, cachedSlackStatus);
      setGoogleStatus(s);
      if (s.connected) {
        // Resume in-progress pipeline or fresh-start if no cache
        if (!pipelineCache.get('google')) activateGoogle();
      } else {
        stopGoogle();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Google Workspace status.');
    } finally {
      setGoogleLoading(false);
    }
  }, [activateGoogle, stopGoogle]);

  const loadSlackStatus = React.useCallback(async () => {
    if (!cachedSlackStatus) setSlackLoading(true);
    try {
      const s = await fetchSlackStatus();
      cachedSlackStatus = s;
      _writeStatusCache(cachedGoogleStatus, cachedSlackStatus);
      setSlackStatus(s);
      if (s.connected) {
        if (!pipelineCache.get('slack')) activateSlack();
      } else {
        stopSlack();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Slack status.');
    } finally {
      setSlackLoading(false);
    }
  }, [activateSlack, stopSlack]);

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
      setBanner({ type: 'success', message: 'Google Workspace connected — syncing in background.' });
      startGoogle(); // fresh start for new connection
      void loadGoogleStatus();
    } else if (slackConnected === '1') {
      setBanner({ type: 'success', message: 'Slack connected — syncing in background.' });
      startSlack();
      void loadSlackStatus();
    } else if (err) {
      setBanner({ type: 'error', message: `Connection failed: ${decodeURIComponent(err)}` });
    }

    if (gwConnected || slackConnected || err) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, loadGoogleStatus, loadSlackStatus, startGoogle, startSlack]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleConnectGoogle = () => {
    window.location.href = getGoogleWorkspaceAuthUrl();
  };

  const handleDisconnectGoogle = async () => {
    stopGoogle();
    cachedGoogleStatus = null;
    setError(null);
    try {
      await disconnectGoogleWorkspace();
      const s: GoogleWorkspaceStatus = { connected: false, email: null, scopes: null, connectedAt: null };
      cachedGoogleStatus = s;
      _writeStatusCache(cachedGoogleStatus, cachedSlackStatus);
      setGoogleStatus(s);
      setBanner({ type: 'success', message: 'Google Workspace disconnected.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect Google Workspace.');
    }
  };

  const handleConnectSlack = () => {
    window.location.href = getSlackAuthUrl();
  };

  const handleDisconnectSlack = async () => {
    stopSlack();
    cachedSlackStatus = null;
    setError(null);
    try {
      await disconnectSlack();
      const s: SlackStatus = { connected: false, teamId: null, teamName: null, scopes: null, connectedAt: null };
      cachedSlackStatus = s;
      _writeStatusCache(cachedGoogleStatus, cachedSlackStatus);
      setSlackStatus(s);
      setBanner({ type: 'success', message: 'Slack disconnected.' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect Slack.');
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const allGoogleDone = googleSteps.every((s) => s.state === 'done');
  const allSlackDone  = slackSteps.every((s)  => s.state === 'done');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-vintage-white flex flex-col font-sans relative overflow-hidden">

      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none z-0 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black_100%)] opacity-70">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
            backgroundSize: '100px 100px',
            backgroundPosition: 'center top'
          }}
        />
        <svg className="absolute w-full h-full opacity-[0.06]" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M -10 15 C 20 5, 70 30, 110 20" stroke="currentColor" strokeWidth="0.2" fill="none" strokeDasharray="1 1" className="text-gray-900" />
          <path d="M -10 85 C 30 70, 60 95, 110 80" stroke="currentColor" strokeWidth="0.15" fill="none" strokeDasharray="2 1" className="text-gray-900" />
          <path d="M 15 -10 C 10 30, 30 70, 20 110" stroke="currentColor" strokeWidth="0.15" fill="none" strokeDasharray="0.5 1" className="text-gray-900" />
          <path d="M 85 -10 C 90 40, 70 60, 80 110" stroke="currentColor" strokeWidth="0.2" fill="none" strokeDasharray="1 2" className="text-gray-900" />
        </svg>
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

          {/* Background sync notice */}
          <AnimatePresence>
            {isAnySyncing && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                  </span>
                  <span className="text-indigo-800 font-medium">
                    Syncing in background — feel free to navigate away
                  </span>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {banner && (
            <div
              className={`relative overflow-hidden rounded-xl border px-4 py-3.5 text-sm shadow-sm ${
                banner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : banner.type === 'info'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
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
              <div
                className={`absolute bottom-0 left-0 h-1 w-full ${
                  banner.type === 'success' ? 'bg-emerald-400' : banner.type === 'info' ? 'bg-indigo-400' : 'bg-red-400'
                }`}
                style={{ animation: 'deplete 4s linear forwards' }}
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
                  <div className="h-12 w-32 bg-gray-100 rounded-full animate-pulse" />
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

            {/* Connected — sequential sync panel */}
            {!googleLoading && googleStatus?.connected && (
              <div className="bg-gray-50/50 px-4 md:px-8 py-5 border-t border-gray-100 space-y-3">
                {googleStatus.email && (
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <p className="text-gray-900 font-medium text-sm">{googleStatus.email}</p>
                    <AnimatePresence>
                      {allGoogleDone && (
                        <motion.span
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="ml-auto text-[10px] font-semibold text-emerald-600 uppercase tracking-widest"
                        >
                          All synced ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {googleSteps.map((step) => (
                    <StepRow
                      key={step.label}
                      step={step}
                      accent={{ bg: 'rgba(239,246,255,0.9)', border: '#93c5fd', text: '#1d4ed8', bar: '#3b82f6' }}
                    />
                  ))}
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
                  <div className="h-12 w-32 bg-gray-100 rounded-full animate-pulse" />
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

            {/* Connected — sequential sync panel */}
            {!slackLoading && slackStatus?.connected && (
              <div className="bg-gray-50/50 px-4 md:px-8 py-5 border-t border-gray-100 space-y-3">
                {slackStatus.teamName && (
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <p className="text-gray-900 font-medium text-sm">{slackStatus.teamName}</p>
                    <AnimatePresence>
                      {allSlackDone && (
                        <motion.span
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="ml-auto text-[10px] font-semibold text-emerald-600 uppercase tracking-widest"
                        >
                          All synced ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {slackSteps.map((step) => (
                    <StepRow
                      key={step.label}
                      step={step}
                      accent={{ bg: 'rgba(245,240,255,0.9)', border: '#c4b5fd', text: '#4A154B', bar: '#7c3aed' }}
                    />
                  ))}
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
