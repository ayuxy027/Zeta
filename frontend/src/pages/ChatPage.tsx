import React from 'react';
import { Bot, Compass, Paperclip, SendHorizontal, Sparkles, User } from 'lucide-react';
import { authConfig } from '../auth/config';

type TabType = 'query' | 'visualise';
type ConnectorKey = 'gmail' | 'slack' | 'drive' | 'meeting';

type SourceRef = {
  id: string;
  system: 'Gmail' | 'Slack' | 'Drive' | 'Meeting';
  label: string;
  excerpt: string;
};

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  meta?: string;
  sources?: SourceRef[];
};

type ConnectorMeta = {
  key: ConnectorKey;
  system: SourceRef['system'];
  alias: string;
  indexed: string;
  lastSync: string;
  highlights: string[];
};

type StatsData = {
  counts: { decisions: number; people: number; topics: number; sources: number };
  decisions: { decision: string; people: string[]; topics: string[]; source: string; when: string }[];
  distribution: Record<string, number>;
};

const CONNECTORS: ConnectorMeta[] = [
  {
    key: 'slack',
    system: 'Slack',
    alias: '@slack',
    indexed: '21,420 messages',
    lastSync: 'Synced 2m ago',
    highlights: ['#growth digest updated', 'Incident notes tagged in #ops-review'],
  },
  {
    key: 'gmail',
    system: 'Gmail',
    alias: '@gmail',
    indexed: '8,102 threads',
    lastSync: 'Synced 5m ago',
    highlights: ['Retention recap refreshed', 'Spend summary thread ingested'],
  },
  {
    key: 'drive',
    system: 'Drive',
    alias: '@drive',
    indexed: '1,384 docs',
    lastSync: 'Synced 7m ago',
    highlights: ['Q2 KPI workbook parsed', 'Onboarding experiment deck indexed'],
  },
  {
    key: 'meeting',
    system: 'Meeting',
    alias: '@meeting',
    indexed: '264 transcripts',
    lastSync: 'Synced 11m ago',
    highlights: ['Exec review transcript labeled', 'Decision log appended'],
  },
];

const INITIAL_MESSAGES: Record<TabType, Message[]> = {
  query: [
    {
      id: 'q-a-1',
      role: 'assistant',
      text: 'Chat with your data using connector aliases. Example: @slack summarize launch blockers this week.',
      meta: 'Zeta · now',
    },
  ],
  visualise: [
    {
      id: 'v-a-1',
      role: 'assistant',
      text: 'Visualise mode shows live data from the knowledge graph. Charts and tables are powered by Neo4j.',
      meta: 'Zeta · now',
    },
  ],
};

const STARTER_QUESTIONS = [
  'Why did we choose PostgreSQL?',
  'What payment provider did we pick and why?',
  'What decisions did Priya make?',
  'What is our caching strategy?',
  'When is our Series A target?',
  'List all major technical decisions',
];

const SOURCE_TYPE_MAP: Record<string, SourceRef['system']> = {
  slack: 'Slack', gmail: 'Gmail', drive: 'Drive', meeting: 'Meeting',
};

function getTaggedConnectors(text: string): ConnectorKey[] {
  const matches = text.toLowerCase().match(/@\w+/g) ?? [];
  const keys = matches
    .map((alias) => CONNECTORS.find((connector) => connector.alias === alias)?.key)
    .filter((key): key is ConnectorKey => Boolean(key));
  return [...new Set(keys)];
}

const ChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabType>('query');
  const [conversations, setConversations] = React.useState<Record<TabType, Message[]>>(INITIAL_MESSAGES);
  const [drafts, setDrafts] = React.useState<Record<TabType, string>>({ query: '', visualise: '' });
  const [isResponding, setIsResponding] = React.useState<Record<TabType, boolean>>({ query: false, visualise: false });
  const [activeConnectorTags, setActiveConnectorTags] = React.useState<Record<TabType, ConnectorKey[]>>({
    query: [],
    visualise: [],
  });
  const [selectedConnectors, setSelectedConnectors] = React.useState<Record<TabType, ConnectorKey[]>>({
    query: [],
    visualise: [],
  });
  const [showAliasMenu, setShowAliasMenu] = React.useState(false);
  const [aliasSearch, setAliasSearch] = React.useState('');

  // Live stats for Visualise tab
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(true);

  const timersRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const feedRef = React.useRef<HTMLDivElement | null>(null);

  const isQuery = activeTab === 'query';
  const draft = drafts[activeTab];
  const responding = isResponding[activeTab];

  const aliasOptions = React.useMemo(() => {
    if (!showAliasMenu) return [];
    const q = aliasSearch.trim().toLowerCase();
    if (!q) return CONNECTORS;
    return CONNECTORS.filter((connector) => connector.alias.startsWith(`@${q}`));
  }, [showAliasMenu, aliasSearch]);

  const visibleConnectorKeys = activeConnectorTags[activeTab].length
    ? activeConnectorTags[activeTab]
    : selectedConnectors[activeTab].length
      ? selectedConnectors[activeTab]
      : getTaggedConnectors(draft);

  const visibleConnectors = CONNECTORS.filter((connector) => visibleConnectorKeys.includes(connector.key));

  // Fetch live stats when switching to Visualise tab
  React.useEffect(() => {
    if (activeTab !== 'visualise') return;
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      try {
        const res = await fetch(`${authConfig.backendUrl}/api/stats`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json() as StatsData;
          if (!cancelled) setStats(data);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setStatsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  React.useEffect(() => { inputRef.current?.focus(); }, [activeTab]);

  React.useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [activeTab, conversations, responding, visibleConnectors.length]);

  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const setDraft = (nextValue: string) => {
    setDrafts((prev) => ({ ...prev, [activeTab]: nextValue }));
  };

  const handleDraftChange = (nextValue: string) => {
    setDraft(nextValue);
    const trigger = nextValue.match(/(?:^|\s)@(\w*)$/);
    if (trigger) {
      setAliasSearch(trigger[1] ?? '');
      setShowAliasMenu(true);
      return;
    }
    setAliasSearch('');
    setShowAliasMenu(false);
  };

  const insertAlias = (alias: string) => {
    const next = draft.replace(/(?:^|\s)@\w*$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}${alias} `;
    });
    setDraft(next);
    setAliasSearch('');
    setShowAliasMenu(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setConversations((prev) => ({ ...prev, [activeTab]: INITIAL_MESSAGES[activeTab] }));
    setDraft('');
    setIsResponding((prev) => ({ ...prev, [activeTab]: false }));
    setActiveConnectorTags((prev) => ({ ...prev, [activeTab]: [] }));
    setSelectedConnectors((prev) => ({ ...prev, [activeTab]: [] }));
    setShowAliasMenu(false);
    setAliasSearch('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (responding || !draft.trim()) return;

    const text = draft.trim();
    const tagged = getTaggedConnectors(text);

    setConversations((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { id: `${activeTab}-u-${Date.now()}`, role: 'user', text, meta: 'You · now' }],
    }));

    setSelectedConnectors((prev) => ({ ...prev, [activeTab]: tagged }));
    setActiveConnectorTags((prev) => ({ ...prev, [activeTab]: tagged }));
    setDraft('');
    setShowAliasMenu(false);
    setAliasSearch('');
    setIsResponding((prev) => ({ ...prev, [activeTab]: true }));

    if (tagged.length > 0) {
      const toastTimer = window.setTimeout(() => {
        setActiveConnectorTags((prev) => ({ ...prev, [activeTab]: [] }));
      }, 2000);
      timersRef.current.push(toastTimer);
    }

    // Real backend call
    try {
      const res = await fetch(`${authConfig.backendUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json() as {
        answer?: string;
        sources?: { source_id: string; source_type: string; preview: string; author?: string; score: number }[];
        error?: string;
      };

      const sources: SourceRef[] = (data.sources ?? []).slice(0, 3).map((s) => ({
        id: s.source_id,
        system: SOURCE_TYPE_MAP[s.source_type] ?? 'Slack',
        label: `${(s.source_type ?? 'source')} · ${(s.score * 100).toFixed(0)}% match`,
        excerpt: s.preview ?? '',
      }));

      setConversations((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: `${activeTab}-a-${Date.now()}`,
            role: 'assistant',
            text: data.answer ?? data.error ?? 'No response',
            meta: 'Zeta · just now',
            sources,
          },
        ],
      }));
    } catch (err) {
      setConversations((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: `${activeTab}-a-${Date.now()}`,
            role: 'assistant',
            text: err instanceof Error ? err.message : 'Something went wrong.',
            meta: 'Zeta · error',
          },
        ],
      }));
    }

    setIsResponding((prev) => ({ ...prev, [activeTab]: false }));
  };

  // ── Visualise data derived from live stats ──
  const visualKpis = stats ? [
    { label: 'Decisions tracked', value: String(stats.counts.decisions), change: 'from knowledge graph' },
    { label: 'Sources indexed', value: String(stats.counts.sources), change: 'Slack + Gmail + Drive' },
    { label: 'People identified', value: String(stats.counts.people), change: 'auto-extracted by LLM' },
    { label: 'Topics covered', value: String(stats.counts.topics), change: 'via Groq extraction' },
  ] : [];

  const visualChannels = stats ? Object.entries(stats.distribution).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
    const total = Object.values(stats.distribution).reduce((a, b) => a + b, 0) || 1;
    const labels: Record<string, string> = { slack: 'Slack', gmail: 'Gmail', drive: 'Drive', meeting: 'Meeting' };
    return { name: labels[key] ?? key, value: Math.round((count / total) * 100) };
  }) : [];

  const visualDecisions = stats?.decisions ?? [];

  return (
    <div className="min-h-screen bg-vintage-white pt-20 pb-12 text-vintage-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <section className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.6)] overflow-hidden">
          <div className="border-b border-gray-200 px-4 sm:px-6 pt-5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" aria-hidden />
                  Chat
                </h1>
                <p className="text-sm sm:text-base text-vintage-gray-600 mt-2 max-w-2xl">
                  {isQuery
                    ? 'Chat with your data across connected systems.'
                    : 'Visualise insights with charts, tables, and source-grounded context.'}
                </p>
                <p className="text-xs text-vintage-gray-500 mt-1 max-w-2xl">
                  Use @ aliases like @slack, @gmail, @drive, and @meeting.
                </p>
              </div>

              {!isQuery ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-medium h-fit">
                  <Compass className="w-3.5 h-3.5" aria-hidden />
                  Visual mode
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2" role="tablist" aria-label="Chat mode tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isQuery}
                  onClick={() => setActiveTab('query')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isQuery
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm'
                      : 'bg-white text-vintage-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Query
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isQuery}
                  onClick={() => setActiveTab('visualise')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    !isQuery
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm'
                      : 'bg-white text-vintage-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Visualise
                </button>
              </div>

              <button
                type="button"
                onClick={clearChat}
                className="text-xs sm:text-sm text-vintage-gray-600 hover:text-vintage-black transition"
              >
                Reset chat
              </button>
            </div>
          </div>

          <div className="h-[65vh] min-h-[500px] max-h-[820px] flex flex-col">
            <div id="chat-feed" ref={feedRef} className="flex-1 overflow-auto px-4 sm:px-6 py-5 space-y-4">
              {activeConnectorTags[activeTab].length > 0 ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-800 font-medium">Routing connectors</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeConnectorTags[activeTab].map((key) => {
                      const connector = CONNECTORS.find((item) => item.key === key);
                      return connector ? (
                        <span key={key} className="inline-flex items-center rounded-full bg-white border border-amber-300 px-2.5 py-1 text-xs text-amber-900">
                          Connector: {connector.system}
                        </span>
                      ) : null;
                    })}
                  </div>
                </section>
              ) : null}

              {visibleConnectors.length > 0 ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500">Connector snapshots</p>
                  {visibleConnectors.map((connector) => (
                    <details key={connector.key} className="rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2">
                      <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-vintage-black">{connector.system}</span>
                        <span className="text-xs text-vintage-gray-500">{connector.lastSync}</span>
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs text-vintage-gray-600">{connector.indexed}</p>
                        {connector.highlights.map((highlight) => (
                          <p key={highlight} className="text-xs text-vintage-gray-700">- {highlight}</p>
                        ))}
                      </div>
                    </details>
                  ))}
                </section>
              ) : null}

              {/* ── Visualise board — live from Neo4j ── */}
              {!isQuery ? (
                statsLoading ? (
                  <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                    <p className="text-sm text-vintage-gray-500">Loading live data from knowledge graph...</p>
                  </section>
                ) : stats ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500">Visualise board</p>
                      <h2 className="text-base sm:text-lg font-semibold text-vintage-black mt-1">Knowledge graph snapshot</h2>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      live from Neo4j
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {visualKpis.map((kpi) => (
                      <article key={kpi.label} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                        <p className="text-[11px] sm:text-xs text-vintage-gray-600">{kpi.label}</p>
                        <p className="text-lg sm:text-xl font-semibold text-vintage-black mt-1">{kpi.value}</p>
                        <p className="text-[11px] text-indigo-700 mt-1">{kpi.change}</p>
                      </article>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <article className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm font-medium text-vintage-black">Source distribution</p>
                      <div className="mt-3 space-y-2.5">
                        {visualChannels.map((channel) => (
                          <div key={channel.name}>
                            <div className="flex items-center justify-between text-xs text-vintage-gray-600 mb-1">
                              <span>{channel.name}</span>
                              <span>{channel.value}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                                style={{ width: `${channel.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm font-medium text-vintage-black">Topics extracted</p>
                      <p className="text-[11px] text-vintage-gray-400 mt-0.5">Auto-detected by Groq LLM</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[...new Set(visualDecisions.flatMap(d => d.topics))].map(topic => (
                          <span key={topic} className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-[11px] text-vintage-gray-700">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </article>
                  </div>

                  <article className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
                      <p className="text-sm font-medium text-vintage-black">Decisions from knowledge graph</p>
                      <span className="text-[10px] uppercase tracking-widest text-vintage-gray-400 font-semibold">Neo4j</span>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-xs sm:text-sm">
                        <thead className="bg-white text-vintage-gray-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Decision</th>
                            <th className="text-left px-3 py-2 font-medium">Who</th>
                            <th className="text-left px-3 py-2 font-medium">Topics</th>
                            <th className="text-left px-3 py-2 font-medium">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {visualDecisions.map((row) => (
                            <tr key={row.decision} className="align-top">
                              <td className="px-3 py-2 text-vintage-black font-medium max-w-[240px] truncate">{row.decision}</td>
                              <td className="px-3 py-2 text-vintage-gray-700 whitespace-nowrap">{row.people.join(', ')}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                  {row.topics.slice(0, 2).map(t => (
                                    <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-vintage-gray-600">{t}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-indigo-700 font-medium capitalize">{row.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </section>
                ) : null
              ) : null}

              {/* Starter prompts — shown only on fresh Query tab */}
              {isQuery && conversations.query.length === 1 && !responding ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
                  <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500 mb-3">Try asking</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STARTER_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setDraft(q);
                          inputRef.current?.focus();
                        }}
                        className="text-left rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm text-vintage-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {conversations[activeTab].map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <article key={message.id} className={`flex items-start gap-3 ${isAssistant ? '' : 'justify-end'}`}>
                    {isAssistant ? (
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" aria-hidden />
                      </span>
                    ) : null}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-[15px] leading-relaxed shadow-sm ${
                        isAssistant
                          ? 'bg-white border border-gray-200 text-vintage-gray-800'
                          : 'bg-indigo-50 border border-indigo-200 text-vintage-gray-900'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.meta ? <p className="text-[11px] mt-2 text-vintage-gray-500">{message.meta}</p> : null}

                      {message.sources && message.sources.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-vintage-gray-600">Sources</p>
                          {message.sources.map((source) => (
                            <div key={source.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <p className="text-xs text-vintage-gray-700">
                                <span className="font-semibold">{source.system}</span> · {source.label}
                              </p>
                              <p className="text-xs text-vintage-gray-500 mt-1">{source.id}</p>
                              <p className="text-xs text-vintage-gray-700 mt-1">{source.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {!isAssistant ? (
                      <span className="w-8 h-8 rounded-full bg-gray-100 text-vintage-gray-700 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" aria-hidden />
                      </span>
                    ) : null}
                  </article>
                );
              })}

              {responding ? (
                <article className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="rounded-2xl px-4 py-3 text-sm border border-gray-200 bg-white text-vintage-gray-600 shadow-sm">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse [animation-delay:240ms]" />
                    </span>
                  </div>
                </article>
              ) : null}
            </div>

            <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
              <form className="flex items-center gap-2 sm:gap-3" onSubmit={(e) => void handleSubmit(e)}>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-gray-200 text-vintage-gray-700 hover:bg-gray-50 inline-flex items-center justify-center disabled:opacity-60"
                  aria-label="Attach"
                  disabled
                >
                  <Paperclip className="w-4 h-4" aria-hidden />
                </button>

                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Message ${isQuery ? 'Query' : 'Visualise'}... (type @ to choose connector)`}
                    value={draft}
                    onChange={(event) => handleDraftChange(event.target.value)}
                    className="w-full h-11 rounded-full border border-gray-200 bg-white px-4 text-sm text-vintage-black placeholder:text-vintage-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />

                  {showAliasMenu && aliasOptions.length > 0 ? (
                    <div className="absolute left-0 right-0 bottom-12 rounded-xl border border-gray-200 bg-white shadow-lg p-1 z-20">
                      {aliasOptions.map((connector) => (
                        <button
                          key={connector.key}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertAlias(connector.alias);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 transition"
                        >
                          <p className="text-sm text-vintage-black font-medium">{connector.alias}</p>
                          <p className="text-xs text-vintage-gray-500">{connector.system}</p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="h-11 px-4 sm:px-5 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-60 disabled:hover:bg-indigo-600"
                  disabled={!draft.trim() || responding}
                >
                  <SendHorizontal className="w-4 h-4" aria-hidden />
                  {responding ? 'Working...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
