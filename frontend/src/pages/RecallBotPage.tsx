import React from "react";
import {
  Loader2,
  RefreshCw,
  Video,
  Bot,
  Clock,
  Users,
  Link,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  fetchRecallSettings,
  updateRecallSettings,
  fetchCalendarStatus,
  syncCalendarNow,
  fetchUpcomingMeetings,
  fetchMeetingHistory,
  fetchMeetingTranscripts,
  sendBotToMeeting,
  fetchTranscriptForMeeting,
  type RecallSettings,
  type CalendarStatus,
  type Meeting,
  type Transcript,
} from "../api/recall";

const RecallBotPage: React.FC = () => {
  const [settings, setSettings] = React.useState<RecallSettings | null>(null);
  const [calendarStatus, setCalendarStatus] =
    React.useState<CalendarStatus | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = React.useState<Meeting[]>([]);
  const [meetingHistory, setMeetingHistory] = React.useState<Meeting[]>([]);
  const [selectedMeetingTranscripts, setSelectedMeetingTranscripts] =
    React.useState<Transcript[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<
    string | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [sendingMeetingId, setSendingMeetingId] = React.useState<string | null>(
    null,
  );
  const [fetchingTranscriptMeetingId, setFetchingTranscriptMeetingId] =
    React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showTranscriptPanel, setShowTranscriptPanel] = React.useState(false);
  const [transcriptLoading, setTranscriptLoading] = React.useState(false);

  const loadData = React.useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (!background) {
        setLoading(true);
        setError(null);
      }

      try {
        const [s, c, u, h] = await Promise.all([
          fetchRecallSettings().catch(() => ({
            isEnabled: false,
            mode: "manual" as const,
            lastSyncedAt: null,
          })),
          fetchCalendarStatus().catch(() => ({
            connected: false,
            calendarId: null,
            calendarEmail: null,
            platform: null,
          })),
          fetchUpcomingMeetings().catch(() => []),
          fetchMeetingHistory().catch(() => []),
        ]);
        setSettings({
          isEnabled: (s as RecallSettings).isEnabled,
          mode:
            (s as RecallSettings).mode === "automation"
              ? "automation"
              : "manual",
          lastSyncedAt: (s as RecallSettings).lastSyncedAt,
        });
        setCalendarStatus(c as CalendarStatus);
        setUpcomingMeetings(u as Meeting[]);
        setMeetingHistory(h as Meeting[]);
      } catch (e) {
        if (!background) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void loadData({ background: true });
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadData]);

  const handleToggleRecall = async () => {
    if (!settings) return;
    setToggling(true);
    setError(null);
    try {
      const updated = await updateRecallSettings({
        isEnabled: !settings.isEnabled,
      });
      setSettings(updated);
      setBanner({
        type: "success",
        message: updated.isEnabled
          ? "Recall bot enabled!"
          : "Recall bot disabled.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update settings");
    } finally {
      setToggling(false);
    }
  };

  const handleModeChange = async (mode: "manual" | "automation") => {
    if (!settings || settings.mode === mode) return;
    setToggling(true);
    setError(null);
    try {
      const updated = await updateRecallSettings({ mode });
      setSettings(updated);
      if (mode === "automation") {
        await syncCalendarNow();
      }
      setBanner({
        type: "success",
        message:
          mode === "automation"
            ? "Automation enabled. Sync started and eligible meetings will be auto-joined."
            : "Manual mode enabled. You control bot start and transcript sync.",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update mode");
    } finally {
      setToggling(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncCalendarNow();
      setBanner({ type: "success", message: "Calendar synced!" });
      const [u, h] = await Promise.all([
        fetchUpcomingMeetings(),
        fetchMeetingHistory(),
      ]);
      setUpcomingMeetings(u);
      setMeetingHistory(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleViewTranscripts = async (meetingId: string) => {
    if (selectedMeetingId === meetingId && showTranscriptPanel) {
      setShowTranscriptPanel(false);
      setSelectedMeetingId(null);
      return;
    }

    setShowTranscriptPanel(true);
    setSelectedMeetingId(meetingId);
    setTranscriptLoading(true);
    setSelectedMeetingTranscripts([]);

    try {
      const transcripts = await fetchMeetingTranscripts(meetingId);
      setSelectedMeetingTranscripts(transcripts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transcripts");
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleSendBot = async (meetingId: string) => {
    setSendingMeetingId(meetingId);
    setError(null);
    try {
      await sendBotToMeeting(meetingId);
      setBanner({ type: "success", message: "Bot sent to meeting." });
      const [u, h] = await Promise.all([
        fetchUpcomingMeetings(),
        fetchMeetingHistory(),
      ]);
      setUpcomingMeetings(u);
      setMeetingHistory(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send bot");
    } finally {
      setSendingMeetingId(null);
    }
  };

  const handleFetchTranscript = async (meetingId: string) => {
    setFetchingTranscriptMeetingId(meetingId);
    setError(null);
    try {
      const result = await fetchTranscriptForMeeting(meetingId);
      if (!result.ready) {
        setBanner({
          type: "error",
          message: result.error ?? "Transcript is not ready yet.",
        });
      } else {
        setBanner({
          type: "success",
          message: `Transcript synced (${result.inserted ?? 0} chunks).`,
        });
        await handleViewTranscripts(meetingId);
      }

      const [u, h] = await Promise.all([
        fetchUpcomingMeetings(),
        fetchMeetingHistory(),
      ]);
      setUpcomingMeetings(u);
      setMeetingHistory(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch transcript");
    } finally {
      setFetchingTranscriptMeetingId(null);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  const getBotStatusColor = (status: string | null) => {
    switch (status) {
      case "joined":
        return "bg-zinc-100 text-zinc-800";
      case "joining":
        return "bg-zinc-100 text-zinc-800";
      case "scheduled":
        return "bg-zinc-100 text-zinc-700";
      case "failed":
        return "bg-zinc-100 text-zinc-800";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  const getPlatformIcon = (p: string | null) => {
    if (p === "google_meet") return "Google Meet";
    if (p === "zoom") return "Zoom";
    if (p === "microsoft_teams") return "Teams";
    return "Meeting";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-50 pt-20">
        <div className="max-w-6xl mx-auto p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );

  const isConnected = !!calendarStatus?.connected;
  const isEnabled = !!settings?.isEnabled;
  const isAutomation = settings?.mode === "automation";

  const premiumCard =
    "rounded-[28px] border border-zinc-200/80 bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_36px_rgba(16,24,40,0.08)]";
  const actionPrimary =
    "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_8px_18px_rgba(0,0,0,0.24)] disabled:cursor-not-allowed disabled:opacity-50";
  const actionSecondary =
    "inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-white pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-6">
        <header className="rounded-[30px] border border-zinc-200/80 bg-white/90 px-6 py-6 shadow-[0_8px_34px_rgba(2,6,23,0.08)] backdrop-blur-sm sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Meeting Intelligence
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                Recall Control Room
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">
                Premium workspace for automated bot joins, transcript capture,
                and meeting recall operations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSyncNow()}
                disabled={syncing || !isConnected || !isEnabled}
                className={actionSecondary}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync Calendar
              </button>
            </div>
          </div>
        </header>

        {banner && (
          <div className="animate-fade-up rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                {banner.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-zinc-700" />
                ) : (
                  <XCircle className="h-4 w-4 text-zinc-700" />
                )}
                {banner.message}
              </div>
              <button
                type="button"
                className="text-xs font-medium text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline"
                onClick={() => setBanner(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="animate-fade-up rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className={`${premiumCard} p-6 space-y-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Workspace Status
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Connection and Recall controls.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${isConnected ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"}`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {!isConnected ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
                  <p className="text-sm text-zinc-600">
                    Connect Google Workspace before using Recall automation.
                  </p>
                  <a href="/connectors" className={actionPrimary}>
                    <Link className="h-4 w-4" />
                    Open Connectors
                  </a>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-zinc-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Recall Engine
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {calendarStatus?.calendarEmail ??
                            "Workspace connected"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleRecall()}
                        disabled={toggling}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${isEnabled ? "bg-zinc-900" : "bg-zinc-300"} ${toggling ? "opacity-60" : "hover:scale-[1.02]"}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="animate-fade-up rounded-2xl border border-zinc-200 p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Mode
                      </h3>
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
                        <button
                          type="button"
                          onClick={() => void handleModeChange("manual")}
                          disabled={toggling}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${settings?.mode === "manual" ? "bg-white text-zinc-900 shadow-[0_3px_10px_rgba(15,23,42,0.08)]" : "text-zinc-600 hover:text-zinc-800"}`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleModeChange("automation")}
                          disabled={toggling}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${settings?.mode === "automation" ? "bg-white text-zinc-900 shadow-[0_3px_10px_rgba(15,23,42,0.08)]" : "text-zinc-600 hover:text-zinc-800"}`}
                        >
                          Automation
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Automation joins meetings that are about to start and
                        syncs transcripts automatically. Manual gives you full
                        control.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </aside>

          <main className="space-y-6">
            {isConnected && isEnabled && (
              <>
                <section className={`${premiumCard} p-6 sm:p-7`}>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-zinc-900">
                      Upcoming Meetings
                    </h2>
                    <span className="text-xs font-medium text-zinc-500">
                      Next 24 hours
                    </span>
                  </div>
                  {upcomingMeetings.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                      No upcoming meetings found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingMeetings.map((m) => (
                        <article
                          key={m.id}
                          className="group rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                                <Video className="h-3.5 w-3.5" />
                                {getPlatformIcon(m.platform)}
                              </div>
                              <h3 className="text-base font-semibold text-zinc-900">
                                {m.title ?? "Untitled Meeting"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatDate(m.startTimeUtc)}{" "}
                                  {formatTime(m.startTimeUtc)} -{" "}
                                  {formatTime(m.endTimeUtc)}
                                </span>
                                {m.attendees && m.attendees.length > 0 && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    {m.attendees.length} attendees
                                  </span>
                                )}
                              </div>
                            </div>
                            {m.botStatus && (
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${getBotStatusColor(m.botStatus)}`}
                              >
                                {normalizeStatusLabel(m.botStatus)}
                              </span>
                            )}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {m.meetingUrl && (
                              <a
                                href={m.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:border-zinc-500 hover:text-zinc-900"
                              >
                                Open URL
                              </a>
                            )}
                            {!isAutomation && (
                              <button
                                type="button"
                                onClick={() => void handleSendBot(m.id)}
                                disabled={
                                  sendingMeetingId === m.id ||
                                  !m.meetingUrl ||
                                  !!m.botId
                                }
                                className={actionPrimary}
                              >
                                {sendingMeetingId === m.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                                {m.botId ? "Bot Started" : "Start Bot"}
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`${premiumCard} p-6 sm:p-7`}>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-zinc-900">
                      Meeting History
                    </h2>
                    <span className="text-xs font-medium text-zinc-500">
                      Latest 50
                    </span>
                  </div>
                  {meetingHistory.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                      Past meetings appear here after completion.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {meetingHistory.map((m) => (
                        <article
                          key={m.id}
                          className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                                <Video className="h-3.5 w-3.5" />
                                {getPlatformIcon(m.platform)}
                              </div>
                              <h3 className="text-base font-semibold text-zinc-900">
                                {m.title ?? "Untitled Meeting"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {formatDate(m.startTimeUtc)}{" "}
                                  {formatTime(m.startTimeUtc)} -{" "}
                                  {formatTime(m.endTimeUtc)}
                                </span>
                                <span>{m.transcriptCount ?? 0} chunks</span>
                              </div>
                            </div>

                            {(m.transcriptCount ?? 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => void handleViewTranscripts(m.id)}
                                className="inline-flex items-center rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all duration-200 hover:border-zinc-500 hover:text-zinc-900"
                              >
                                View Transcript
                              </button>
                            )}
                          </div>

                          {!isAutomation && m.botId && (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => void handleFetchTranscript(m.id)}
                                disabled={fetchingTranscriptMeetingId === m.id}
                                className={actionSecondary}
                              >
                                {fetchingTranscriptMeetingId === m.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Fetch Transcript
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {showTranscriptPanel && (
              <div className="fixed inset-0 z-50 bg-black/45 p-4 sm:p-8">
                <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
                  <section
                    className={`${premiumCard} w-full max-h-[90vh] p-6 sm:p-7`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Transcript"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-zinc-900">
                        Transcript
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTranscriptPanel(false);
                          setSelectedMeetingId(null);
                        }}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-900"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
                      {transcriptLoading ? (
                        <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-12 text-sm text-zinc-600">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading transcript...
                        </div>
                      ) : selectedMeetingTranscripts.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
                          No transcript chunks found for this meeting.
                        </div>
                      ) : (
                        selectedMeetingTranscripts.map((c) => (
                          <article
                            key={c.id}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3"
                          >
                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900">
                                {c.speaker ?? "Unknown"}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatTime(c.startTranscriptTime)} -{" "}
                                {formatTime(c.endTranscriptTime)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-zinc-700">
                              {c.transcriptText}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

function normalizeStatusLabel(status: string): string {
  if (status === "joined") return "In meeting";
  if (status === "joining") return "Joining";
  if (status === "scheduled") return "Scheduled";
  if (status === "left") return "Left";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

export default RecallBotPage;
