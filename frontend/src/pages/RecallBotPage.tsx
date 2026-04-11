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
  const [meetingsLoading, setMeetingsLoading] = React.useState(false);
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
        const [s, c] = await Promise.all([
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
        ]);

        const normalizedSettings: RecallSettings = {
          isEnabled: (s as RecallSettings).isEnabled,
          mode:
            (s as RecallSettings).mode === "automation"
              ? "automation"
              : "manual",
          lastSyncedAt: (s as RecallSettings).lastSyncedAt,
        };
        const normalizedCalendarStatus = c as CalendarStatus;

        setSettings(normalizedSettings);
        setCalendarStatus(normalizedCalendarStatus);

        if (!background) {
          setLoading(false);
        }

        if (
          normalizedSettings.isEnabled &&
          normalizedCalendarStatus.connected
        ) {
          setMeetingsLoading(true);
          const [u, h] = await Promise.all([
            fetchUpcomingMeetings().catch(() => []),
            fetchMeetingHistory().catch(() => []),
          ]);
          setUpcomingMeetings(u as Meeting[]);
          setMeetingHistory(h as Meeting[]);
          setMeetingsLoading(false);
        } else {
          setUpcomingMeetings([]);
          setMeetingHistory([]);
          setMeetingsLoading(false);
        }
      } catch (e) {
        if (!background) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
        setMeetingsLoading(false);
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
      <div className="min-h-screen bg-vintage-white pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      </div>
    );

  const isConnected = !!calendarStatus?.connected;
  const isEnabled = !!settings?.isEnabled;
  const isAutomation = settings?.mode === "automation";

  const premiumCard = "rounded-xl border border-gray-200 bg-white";
  const actionPrimary =
    "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
  const actionSecondary =
    "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-vintage-black transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-vintage-white pt-20 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 space-y-6">
        <header className="rounded-xl border border-gray-200 bg-white px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-vintage-gray-500">
                Meeting Intelligence Workspace
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-vintage-black">
                Recall
              </h1>
              <p className="mt-1 text-sm text-vintage-gray-500">
                Control bot joins, transcript capture, and meeting operations in
                one dashboard.
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
          <div className="animate-fade-up rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-vintage-black">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                {banner.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                {banner.message}
              </div>
              <button
                type="button"
                className="text-xs font-medium text-vintage-gray-500 underline-offset-4 hover:text-vintage-black hover:underline"
                onClick={() => setBanner(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="animate-fade-up rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className={`${premiumCard} p-5 space-y-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-vintage-black">
                    Workspace Status
                  </h2>
                  <p className="mt-1 text-sm text-vintage-gray-500">
                    Connection and Recall controls.
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isConnected ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-vintage-gray-500"}`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {!isConnected ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                  <p className="text-sm text-vintage-gray-500">
                    Connect Google Workspace before using Recall automation.
                  </p>
                  <a href="/connectors" className={actionPrimary}>
                    <Link className="h-4 w-4" />
                    Open Connectors
                  </a>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-vintage-black">
                          Recall Engine
                        </p>
                        <p className="mt-1 text-xs text-vintage-gray-500">
                          {calendarStatus?.calendarEmail ??
                            "Workspace connected"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleRecall()}
                        disabled={toggling}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${isEnabled ? "bg-indigo-600" : "bg-zinc-300"} ${toggling ? "opacity-60" : "hover:scale-[1.02]"}`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="animate-fade-up rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-vintage-black">
                        Mode
                      </h3>
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() => void handleModeChange("manual")}
                          disabled={toggling}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${settings?.mode === "manual" ? "bg-white text-vintage-black shadow-sm" : "text-vintage-gray-500 hover:text-vintage-black"}`}
                        >
                          Manual
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleModeChange("automation")}
                          disabled={toggling}
                          className={`rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ${settings?.mode === "automation" ? "bg-white text-vintage-black shadow-sm" : "text-vintage-gray-500 hover:text-vintage-black"}`}
                        >
                          Automation
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-vintage-gray-500">
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
                <section
                  className={`${premiumCard} p-5 hover:shadow-md transition-shadow`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-vintage-black">
                      Upcoming Meetings
                    </h2>
                    <span className="text-xs text-vintage-gray-500">
                      Next 24 hours
                    </span>
                  </div>
                  {meetingsLoading ? (
                    <p className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-sm text-vintage-gray-500 inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading meetings...
                    </p>
                  ) : upcomingMeetings.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-sm text-vintage-gray-500">
                      No upcoming meetings found.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingMeetings.map((m) => (
                        <article
                          key={m.id}
                          className="group rounded-xl border border-gray-200 bg-white px-4 py-4 transition hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-vintage-gray-500">
                                <Video className="h-3.5 w-3.5" />
                                {getPlatformIcon(m.platform)}
                              </div>
                              <h3 className="text-base font-semibold text-vintage-black">
                                {m.title ?? "Untitled Meeting"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-vintage-gray-500">
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
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-vintage-black transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
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

                <section
                  className={`${premiumCard} p-5 hover:shadow-md transition-shadow`}
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-vintage-black">
                      Meeting History
                    </h2>
                    <span className="text-xs text-vintage-gray-500">
                      Latest 50
                    </span>
                  </div>
                  {meetingsLoading ? (
                    <p className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-sm text-vintage-gray-500 inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading history...
                    </p>
                  ) : meetingHistory.length === 0 ? (
                    <p className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-sm text-vintage-gray-500">
                      Past meetings appear here after completion.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {meetingHistory.map((m) => (
                        <article
                          key={m.id}
                          className="rounded-xl border border-gray-200 bg-white px-4 py-4 transition hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-vintage-gray-500">
                                <Video className="h-3.5 w-3.5" />
                                {getPlatformIcon(m.platform)}
                              </div>
                              <h3 className="text-base font-semibold text-vintage-black">
                                {m.title ?? "Untitled Meeting"}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-vintage-gray-500">
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
                                className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-vintage-black transition-colors hover:border-indigo-300 hover:bg-indigo-50/30"
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
                      <h2 className="text-base font-semibold text-vintage-black">
                        Transcript
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTranscriptPanel(false);
                          setSelectedMeetingId(null);
                        }}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-vintage-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-vintage-black"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
                      {transcriptLoading ? (
                        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-12 text-sm text-vintage-gray-500">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading transcript...
                        </div>
                      ) : selectedMeetingTranscripts.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-6 text-sm text-vintage-gray-500">
                          No transcript chunks found for this meeting.
                        </div>
                      ) : (
                        selectedMeetingTranscripts.map((c) => (
                          <article
                            key={c.id}
                            className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3"
                          >
                            <div className="mb-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-vintage-black">
                                {c.speaker ?? "Unknown"}
                              </span>
                              <span className="text-xs text-vintage-gray-500">
                                {formatTime(c.startTranscriptTime)} -{" "}
                                {formatTime(c.endTranscriptTime)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-vintage-gray-700">
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
