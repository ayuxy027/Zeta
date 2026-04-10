import React from "react";
import { Loader2, Video, Bot, Clock, Users, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import {
  fetchRecallSettings, updateRecallSettings, connectCalendar, fetchCalendarStatus,
  fetchUpcomingMeetings, fetchMeetingHistory, fetchMeetingTranscripts,
  type RecallSettings, type CalendarStatus, type Meeting, type Transcript,
} from "../api/recall";

const RecallBotPage: React.FC = () => {
  const [settings, setSettings] = React.useState<RecallSettings | null>(null);
  const [calendarStatus, setCalendarStatus] = React.useState<CalendarStatus | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = React.useState<Meeting[]>([]);
  const [meetingHistory, setMeetingHistory] = React.useState<Meeting[]>([]);
  const [selectedMeetingTranscripts, setSelectedMeetingTranscripts] = React.useState<Transcript[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [toggling, setToggling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showTranscriptPanel, setShowTranscriptPanel] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [s, c, u, h] = await Promise.all([
        fetchRecallSettings().catch(() => ({ isEnabled: false, lastSyncedAt: null })),
        fetchCalendarStatus().catch(() => ({ connected: false, calendarId: null, calendarEmail: null, platform: null })),
        fetchUpcomingMeetings().catch(() => []),
        fetchMeetingHistory().catch(() => []),
      ]);
      setSettings(s as RecallSettings); setCalendarStatus(c as CalendarStatus);
      setUpcomingMeetings(u as Meeting[]); setMeetingHistory(h as Meeting[]);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load data"); }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => { void loadData(); }, [loadData]);

  React.useEffect(() => {
    if (!loading && !calendarStatus?.connected) {
      connectCalendar().then(setCalendarStatus).catch(() => {});
    }
  }, [loading, calendarStatus?.connected]);

  const handleToggleRecall = async () => {
    if (!settings) return;
    setToggling(true); setError(null);
    try {
      const updated = await updateRecallSettings(!settings.isEnabled);
      setSettings(updated);
      setBanner({ type: "success", message: updated.isEnabled ? "Recall bot enabled!" : "Recall bot disabled." });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to update settings"); }
    finally { setToggling(false); }
  };

  const handleViewTranscripts = async (meetingId: string) => {
    if (selectedMeetingId === meetingId && showTranscriptPanel) { setShowTranscriptPanel(false); setSelectedMeetingId(null); return; }
    try {
      const transcripts = await fetchMeetingTranscripts(meetingId);
      setSelectedMeetingTranscripts(transcripts); setSelectedMeetingId(meetingId); setShowTranscriptPanel(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load transcripts"); }
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

  const getBotStatusColor = (status: string | null) => {
    switch (status) {
      case "joined": return "bg-emerald-100 text-emerald-700";
      case "joining": return "bg-blue-100 text-blue-700";
      case "scheduled": return "bg-yellow-100 text-yellow-700";
      case "failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getPlatformIcon = (p: string | null) => {
    if (p === "google_meet") return "🟢"; if (p === "zoom") return "🔵"; if (p === "microsoft_teams") return "🟣"; return "⚪";
  };

  if (loading) return (
    <div className="min-h-screen bg-vintage-white pt-20"><div className="max-w-6xl mx-auto p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-vintage-gray-400" /></div></div>
  );

  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-vintage-black flex items-center gap-3"><Bot className="w-8 h-8 text-indigo-600" />Recall Bot</h1>
          <p className="text-vintage-gray-600 mt-2 max-w-2xl">Automatically join your meetings and generate transcripts.</p>
        </div>

        {banner && (<div className={`rounded-xl border px-4 py-3 text-sm ${banner.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"}`}>{banner.message}<button type="button" className="ml-3 underline" onClick={() => setBanner(null)}>Dismiss</button></div>)}
        {error && (<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>)}

        {/* Settings */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Bot className="w-6 h-6 text-indigo-600" /></div>
              <div><h2 className="text-lg font-semibold text-vintage-black">Recall Bot</h2><p className="text-sm text-vintage-gray-500">Automatic meeting transcription</p></div>
            </div>
            <button type="button" onClick={() => void handleToggleRecall()} disabled={toggling || !calendarStatus?.connected}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings?.isEnabled ? "bg-indigo-600" : "bg-gray-200"} ${(toggling || !calendarStatus?.connected) ? "opacity-50 cursor-not-allowed" : ""}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings?.isEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="border-t border-gray-100 pt-4">
            {calendarStatus?.connected ? (
              <div className="flex items-center gap-2 text-sm text-vintage-gray-700"><Clock className="w-4 h-4" /><span>Connected: <strong>{calendarStatus.calendarEmail}</strong></span></div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">Please connect Google Workspace first on the <a href="/connectors" className="font-medium underline">Connectors</a> page.</div>
            )}
          </div>
        </section>

        {/* Upcoming */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vintage-black flex items-center gap-2"><Video className="w-5 h-5 text-indigo-600" />Upcoming Meetings</h2>
          {upcomingMeetings.length === 0 ? (<p className="text-vintage-gray-500 text-sm">No upcoming meetings in the next 24 hours.</p>) : (
            <div className="space-y-3">{upcomingMeetings.map(m => (
              <div key={m.id} className="rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-vintage-black">{getPlatformIcon(m.platform)} {m.title ?? "Untitled Meeting"}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-vintage-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDate(m.startTimeUtc)} · {formatTime(m.startTimeUtc)} - {formatTime(m.endTimeUtc)}</span>
                      {m.attendees && m.attendees.length > 0 && (<span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{m.attendees.length} attendees</span>)}
                    </div>
                  </div>
                  {m.botStatus && (<span className={`px-2 py-1 rounded-full text-xs font-medium ${getBotStatusColor(m.botStatus)}`}>{m.botStatus}</span>)}
                </div>
                {m.meetingUrl && (<a href={m.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">Join Meeting →</a>)}
              </div>
            ))}</div>
          )}
        </section>

        {/* History */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-vintage-black flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-600" />Meeting History</h2>
          {meetingHistory.length === 0 ? (<p className="text-vintage-gray-500 text-sm">No past meetings with transcripts yet.</p>) : (
            <div className="space-y-3">{meetingHistory.map(m => (
              <div key={m.id} className="rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-vintage-black">{getPlatformIcon(m.platform)} {m.title ?? "Untitled Meeting"}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-vintage-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDate(m.startTimeUtc)} · {formatTime(m.startTimeUtc)} - {formatTime(m.endTimeUtc)}</span>
                      <span className="flex items-center gap-1 text-indigo-600"><MessageSquare className="w-3.5 h-3.5" />{m.transcriptCount ?? 0} chunks</span>
                    </div>
                  </div>
                  {(m.transcriptCount ?? 0) > 0 && (
                    <button type="button" onClick={() => void handleViewTranscripts(m.id)} className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700">
                      {showTranscriptPanel && selectedMeetingId === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}View
                    </button>
                  )}
                </div>
              </div>
            ))}</div>
          )}
        </section>

        {/* Transcript Panel */}
        {showTranscriptPanel && selectedMeetingTranscripts.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-vintage-black">Transcript</h2>
              <button type="button" onClick={() => { setShowTranscriptPanel(false); setSelectedMeetingId(null); }} className="text-sm text-vintage-gray-500 hover:text-vintage-gray-700">Close</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedMeetingTranscripts.map(c => (
                <div key={c.id} className="border-l-2 border-indigo-200 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1"><span className="font-medium text-sm text-vintage-black">{c.speaker ?? "Unknown"}</span><span className="text-xs text-vintage-gray-400">{formatTime(c.startTranscriptTime)}</span></div>
                  <p className="text-sm text-vintage-gray-700">{c.transcriptText}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default RecallBotPage;
