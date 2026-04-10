import React from 'react';
import {
  Bot, SendHorizontal, User, AlertCircle, MessageSquare,
  Hash, Mail, FileText, Mic, BarChart3,
} from 'lucide-react';
import { authConfig } from '../auth/config';

/* ─── Types ───────────────────────────────────────────────────────────── */

type TabType = 'query' | 'visualise';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  sources?: Source[];
  error?: boolean;
};

type Source = {
  source_id: string;
  source_type: string;
  preview: string;
  author?: string;
  score: number;
};

/* ─── Constants ───────────────────────────────────────────────────────── */

const STARTER_PROMPTS = [
  { text: 'Why did we choose PostgreSQL?', icon: Hash },
  { text: 'Why Stripe over Razorpay?', icon: Mail },
  { text: 'What is our caching strategy?', icon: FileText },
  { text: 'List all major decisions and who made them', icon: User },
];

const SOURCE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  slack: Hash, gmail: Mail, drive: FileText, meeting: Mic,
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100' };

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  slack: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' },
  gmail: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100' },
  drive: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
  meeting: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
};

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm Zeta, your org memory assistant. Ask me anything about your team's decisions — I'll search Slack, Gmail, and Drive and give you a cited answer.",
};

/* ─── Visualise data ──────────────────────────────────────────────────── */

type StatsData = {
  counts: { decisions: number; people: number; topics: number; sources: number };
  decisions: { decision: string; people: string[]; topics: string[]; source: string; when: string }[];
  distribution: Record<string, number>;
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */

async function queryBackend(question: string): Promise<{ answer: string; sources: Source[] }> {
  const res = await fetch(`${authConfig.backendUrl}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error?: string }).error ?? 'Request failed');
  }
  return res.json() as Promise<{ answer: string; sources: Source[] }>;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct > 60 ? '#22c55e' : pct > 35 ? '#eab308' : '#94a3b8' }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-vintage-gray-400 font-medium">{pct}%</span>
    </div>
  );
}

/* ─── Visualise Panel (live from Neo4j) ───────────────────────────────── */

const SOURCE_BAR_COLORS: Record<string, string> = {
  slack: '#a855f7', gmail: '#ef4444', drive: '#3b82f6', meeting: '#f59e0b',
};

const SOURCE_LABELS: Record<string, string> = {
  slack: 'Slack', gmail: 'Gmail', drive: 'Drive', meeting: 'Meeting',
};

function VisualisePanel() {
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${authConfig.backendUrl}/api/stats`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json() as StatsData;
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-vintage-gray-400 text-sm">
        Loading live data from knowledge graph...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-20 text-red-500 text-sm">
        {error ?? 'No data available'}
      </div>
    );
  }

  const { counts, decisions, distribution } = stats;
  const totalSources = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  const kpis = [
    { label: 'Decisions tracked', value: String(counts.decisions), sub: 'from knowledge graph' },
    { label: 'Sources indexed', value: String(counts.sources), sub: 'Slack + Gmail + Drive' },
    { label: 'People identified', value: String(counts.people), sub: 'auto-extracted' },
    { label: 'Topics covered', value: String(counts.topics), sub: 'via LLM extraction' },
  ];

  const distEntries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4 px-5 py-5 overflow-y-auto">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {kpis.map(kpi => (
          <article key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-[11px] text-vintage-gray-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-vintage-black mt-1">{kpi.value}</p>
            <p className="text-[11px] text-indigo-600 mt-1">{kpi.sub}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Source donut-style distribution */}
        <article className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-sm font-medium text-vintage-black">Source distribution</p>
          <p className="text-[11px] text-vintage-gray-400 mt-0.5">Decisions by source type</p>
          <div className="mt-4 space-y-3">
            {distEntries.map(([key, count]) => {
              const pct = Math.round((count / totalSources) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-vintage-gray-600 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: SOURCE_BAR_COLORS[key] ?? '#94a3b8' }} />
                      {SOURCE_LABELS[key] ?? key}
                    </span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: SOURCE_BAR_COLORS[key] ?? '#94a3b8' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Topic cloud */}
        <article className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-sm font-medium text-vintage-black">Topics extracted</p>
          <p className="text-[11px] text-vintage-gray-400 mt-0.5">Auto-detected by Groq LLM from raw messages</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set(decisions.flatMap(d => d.topics))].map(topic => (
              <span key={topic} className="rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs text-vintage-gray-700">
                {topic}
              </span>
            ))}
          </div>
        </article>
      </div>

      {/* Decision table — live from Neo4j */}
      <article className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <p className="text-sm font-medium text-vintage-black">Decisions from knowledge graph</p>
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live from Neo4j
          </span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50/50 text-vintage-gray-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Decision</th>
                <th className="text-left px-3 py-2 font-medium">Who</th>
                <th className="text-left px-3 py-2 font-medium">Topics</th>
                <th className="text-left px-3 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {decisions.map(row => {
                const colors = SOURCE_COLORS[row.source] ?? DEFAULT_COLOR;
                return (
                  <tr key={row.decision} className="hover:bg-gray-50/50 transition">
                    <td className="px-3 py-2.5 text-vintage-black font-medium max-w-[300px] truncate">{row.decision}</td>
                    <td className="px-3 py-2.5 text-vintage-gray-600 whitespace-nowrap">{row.people.join(', ')}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.topics.slice(0, 2).map(t => (
                          <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-vintage-gray-600">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full ${colors.bg} ${colors.text} px-2 py-0.5 text-[10px] font-medium capitalize`}>
                        {SOURCE_LABELS[row.source] ?? row.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

const ChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabType>('query');
  const [messages, setMessages] = React.useState<Message[]>([WELCOME]);
  const [draft, setDraft] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const feedRef = React.useRef<HTMLDivElement>(null);
  const idRef = React.useRef(0);

  const isQuery = activeTab === 'query';

  React.useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, loading]);

  const nextId = () => { idRef.current += 1; return String(idRef.current); };

  const handleSubmit = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { id: nextId(), role: 'user', text: q }]);
    setDraft('');
    setLoading(true);
    try {
      const data = await queryBackend(q);
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', text: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', text: err instanceof Error ? err.message : 'Something went wrong.', error: true }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const showStarters = messages.length === 1 && !loading && isQuery;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-vintage-white pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <section
          className="rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col"
          style={{ height: 'calc(100vh - 120px)' }}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <div className="border-b border-gray-100 px-5 py-3.5 flex items-center gap-3 bg-white">
            <div className="w-8 h-8 rounded-lg bg-vintage-black flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-vintage-black leading-tight">Zeta</h1>
              <p className="text-[11px] text-vintage-gray-500 truncate">
                {isQuery ? 'Ask questions across your org data' : 'Visual analytics from your knowledge graph'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={isQuery}
                onClick={() => setActiveTab('query')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isQuery ? 'bg-white text-vintage-black shadow-sm' : 'text-vintage-gray-500 hover:text-vintage-black'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Query
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isQuery}
                onClick={() => setActiveTab('visualise')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  !isQuery ? 'bg-white text-vintage-black shadow-sm' : 'text-vintage-gray-500 hover:text-vintage-black'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Visualise
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-vintage-gray-400">Live</span>
            </div>

            {isQuery && (
              <button
                type="button"
                onClick={() => { setMessages([WELCOME]); setDraft(''); }}
                className="text-[11px] text-vintage-gray-400 hover:text-vintage-black rounded-full border border-gray-200 px-2.5 py-1 hover:border-gray-300 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Visualise tab ──────────────────────────────────── */}
          {!isQuery && (
            <div className="flex-1 overflow-y-auto bg-gray-50/40">
              <VisualisePanel />
            </div>
          )}

          {/* ── Query tab — Feed ───────────────────────────────── */}
          {isQuery && (
            <>
              <div ref={feedRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-gray-50/40">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.role === 'assistant' && (
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.error ? 'bg-red-100' : 'bg-vintage-black'
                      }`}>
                        {msg.error ? <AlertCircle className="w-3.5 h-3.5 text-red-600" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                      </span>
                    )}

                    <div className={`max-w-[82%] space-y-2 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                      <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-vintage-black text-white rounded-tr-md'
                          : msg.error
                            ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-md'
                            : 'bg-white border border-gray-200/80 text-vintage-gray-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-tl-md'
                      }`}>
                        {msg.text}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-1.5 w-full">
                          <p className="text-[10px] text-vintage-gray-400 font-semibold uppercase tracking-widest pl-1">Sources</p>
                          {msg.sources.slice(0, 3).map((s, i) => {
                            const colors = SOURCE_COLORS[s.source_type] ?? DEFAULT_COLOR;
                            const SourceIcon = SOURCE_ICONS[s.source_type] ?? Hash;
                            return (
                              <div key={s.source_id} className={`rounded-xl border ${colors.border} bg-white px-3 py-2 text-xs transition hover:shadow-sm`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`w-5 h-5 rounded-md ${colors.bg} ${colors.text} flex items-center justify-center`}>
                                    <SourceIcon className="w-3 h-3" />
                                  </span>
                                  <span className="font-semibold text-vintage-black text-[11px]">Source {i + 1}</span>
                                  <span className={`rounded-full ${colors.bg} ${colors.text} px-2 py-0.5 text-[10px] capitalize font-medium`}>{s.source_type}</span>
                                  {s.author && <span className="text-vintage-gray-400 text-[11px]">{s.author}</span>}
                                  <span className="ml-auto"><ScoreBar score={s.score} /></span>
                                </div>
                                <p className="text-vintage-gray-500 line-clamp-2 leading-relaxed text-[11px] pl-7">{s.preview}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <span className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-vintage-gray-600" />
                      </span>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-vintage-black flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white border border-gray-200/80 shadow-sm">
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {showStarters && (
                <div className="px-5 pb-3 pt-1 bg-white border-t border-gray-100">
                  <p className="text-[10px] text-vintage-gray-400 uppercase tracking-widest font-semibold mb-2 pl-0.5">Try asking</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STARTER_PROMPTS.map(({ text, icon: Icon }) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => void handleSubmit(text)}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-xs text-vintage-gray-700 hover:border-vintage-black hover:bg-gray-100 transition text-left group"
                      >
                        <Icon className="w-3.5 h-3.5 text-vintage-gray-400 group-hover:text-vintage-black transition shrink-0" />
                        <span className="line-clamp-1">{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 px-5 py-3.5 bg-white">
                <form onSubmit={e => { e.preventDefault(); void handleSubmit(draft); }} className="flex items-center gap-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Ask about any decision, person, or topic..."
                    className="flex-1 h-10 rounded-xl border border-gray-200 px-3.5 text-sm focus:outline-none focus:border-vintage-black focus:ring-1 focus:ring-vintage-black/10 bg-gray-50/50 placeholder:text-vintage-gray-400 transition"
                    autoComplete="off"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || loading}
                    className="h-10 w-10 rounded-xl bg-vintage-black text-white flex items-center justify-center hover:bg-gray-800 transition disabled:opacity-30"
                  >
                    <SendHorizontal className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
