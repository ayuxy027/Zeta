import React from 'react';
import { Bot, Compass, Paperclip, SendHorizontal, Sparkles, User } from 'lucide-react';

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
      meta: 'Sandy - now',
    },
  ],
  visualise: [
    {
      id: 'v-a-1',
      role: 'assistant',
      text: 'Visualise mode is ready with charts and tables. Add aliases like @drive or @meeting to focus the context.',
      meta: 'Sandy - now',
    },
  ],
};

const SOURCES: Record<TabType, SourceRef[]> = {
  query: [
    {
      id: 'gmail-msg-29211',
      system: 'Gmail',
      label: 'Experiment recap',
      excerpt: 'Activation improved after onboarding checklist simplification.',
    },
    {
      id: 'slack-ts-187201.6622',
      system: 'Slack',
      label: '#cx weekly digest',
      excerpt: 'Users mention faster time-to-value after first-run revamp.',
    },
    {
      id: 'drive-doc-ax4k2',
      system: 'Drive',
      label: 'Retention deep-dive deck',
      excerpt: 'Week-1 churn slope flattens in latest cohort comparison.',
    },
  ],
  visualise: [
    {
      id: 'drive-doc-z19q7',
      system: 'Drive',
      label: 'Quarterly KPI sheet',
      excerpt: 'Paid channel growth spike in week 8 with higher variance.',
    },
    {
      id: 'meeting-tr-6610',
      system: 'Meeting',
      label: 'Ops review transcript',
      excerpt: 'Team attributes anomaly to campaign batching delay.',
    },
    {
      id: 'slack-ts-190111.2011',
      system: 'Slack',
      label: '#analytics follow-up',
      excerpt: 'Variance validated against raw weekly exports.',
    },
  ],
};

const VISUAL_KPIS = [
  { label: 'Qualified leads', value: '18,240', change: '+9.8% QoQ' },
  { label: 'Activation rate', value: '42.7%', change: '+3.1 pts' },
  { label: 'Paid conversion', value: '11.9%', change: '-0.6 pts' },
  { label: 'Churn risk users', value: '1,134', change: '-12.4% MoM' },
];

const VISUAL_CHANNELS = [
  { name: 'Product-led', value: 86 },
  { name: 'Organic search', value: 74 },
  { name: 'Referrals', value: 58 },
  { name: 'Paid social', value: 41 },
  { name: 'Outbound', value: 33 },
];

const VISUAL_TREND = [42, 48, 45, 57, 61, 59, 67, 72, 69, 76, 81, 84];

const VISUAL_OUTLIERS = [
  {
    metric: 'Paid CAC',
    week: 'Wk 8',
    variance: '+27%',
    note: 'Campaign pacing mismatch after budget reallocation.',
  },
  {
    metric: 'Trial exits (Day 1)',
    week: 'Wk 5',
    variance: '-19%',
    note: 'Onboarding checklist update reduced first-session drop.',
  },
  {
    metric: 'Docs-to-signup CTR',
    week: 'Wk 10',
    variance: '+15%',
    note: 'Comparison table improved bottom-funnel intent.',
  },
];

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
  const timersRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const feedRef = React.useRef<HTMLDivElement | null>(null);

  const isQuery = activeTab === 'query';
  const draft = drafts[activeTab];
  const responding = isResponding[activeTab];

  const aliasOptions = React.useMemo(() => {
    if (!showAliasMenu) {
      return [];
    }
    const q = aliasSearch.trim().toLowerCase();
    if (!q) {
      return CONNECTORS;
    }
    return CONNECTORS.filter((connector) => connector.alias.startsWith(`@${q}`));
  }, [showAliasMenu, aliasSearch]);

  const trendPoints = React.useMemo(() => {
    return VISUAL_TREND.map((value, index) => {
      const x = (index / (VISUAL_TREND.length - 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    }).join(' ');
  }, []);

  const visibleConnectorKeys = activeConnectorTags[activeTab].length
    ? activeConnectorTags[activeTab]
    : selectedConnectors[activeTab].length
      ? selectedConnectors[activeTab]
      : getTaggedConnectors(draft);

  const visibleConnectors = CONNECTORS.filter((connector) => visibleConnectorKeys.includes(connector.key));

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  React.useEffect(() => {
    const feed = feedRef.current;
    if (!feed) {
      return;
    }
    feed.scrollTop = feed.scrollHeight;
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (responding || !draft.trim()) {
      return;
    }

    const text = draft.trim();
    const tagged = getTaggedConnectors(text);
    const systems = tagged
      .map((key) => CONNECTORS.find((connector) => connector.key === key)?.system)
      .filter((value): value is SourceRef['system'] => Boolean(value));

    setConversations((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { id: `${activeTab}-u-${Date.now()}`, role: 'user', text, meta: 'You - now' }],
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

    const replyTimer = window.setTimeout(() => {
      const sourceSet = tagged.length
        ? SOURCES[activeTab].filter((source) => {
            const key = CONNECTORS.find((connector) => connector.system === source.system)?.key;
            return key ? tagged.includes(key) : false;
          })
        : SOURCES[activeTab];

      const replyText =
        systems.length > 0
          ? `Connected context from ${systems.join(' + ')}. Here is the source-backed answer path.`
          : 'Connected context from your workspace memory. Here is the source-backed answer path.';

      setConversations((prev) => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab],
          {
            id: `${activeTab}-a-${Date.now()}`,
            role: 'assistant',
            text: replyText,
            meta: 'Sandy - now',
            sources: sourceSet,
          },
        ],
      }));
      setIsResponding((prev) => ({ ...prev, [activeTab]: false }));
    }, 700);

    timersRef.current.push(replyTimer);
  };

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
                        <span
                          key={key}
                          className="inline-flex items-center rounded-full bg-white border border-amber-300 px-2.5 py-1 text-xs text-amber-900"
                        >
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

              {!isQuery ? (
                <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500">Visualise board</p>
                      <h2 className="text-base sm:text-lg font-semibold text-vintage-black mt-1">Analytics snapshot</h2>
                    </div>
                    <span className="text-xs text-vintage-gray-500 rounded-full bg-gray-100 px-2.5 py-1">live view</span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {VISUAL_KPIS.map((kpi) => (
                      <article key={kpi.label} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                        <p className="text-[11px] sm:text-xs text-vintage-gray-600">{kpi.label}</p>
                        <p className="text-lg sm:text-xl font-semibold text-vintage-black mt-1">{kpi.value}</p>
                        <p className="text-[11px] text-indigo-700 mt-1">{kpi.change}</p>
                      </article>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <article className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm font-medium text-vintage-black">Growth trend (12 weeks)</p>
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-2">
                        <svg viewBox="0 0 100 100" className="w-full h-32" preserveAspectRatio="none" aria-label="Growth trend line">
                          <polyline
                            fill="none"
                            stroke="rgb(79 70 229)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={trendPoints}
                          />
                        </svg>
                      </div>
                    </article>

                    <article className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-sm font-medium text-vintage-black">Channel contribution</p>
                      <div className="mt-3 space-y-2.5">
                        {VISUAL_CHANNELS.map((channel) => (
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
                  </div>

                  <article className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 bg-gray-50/80">
                      <p className="text-sm font-medium text-vintage-black">Outlier table</p>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-xs sm:text-sm">
                        <thead className="bg-white text-vintage-gray-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Metric</th>
                            <th className="text-left px-3 py-2 font-medium">Week</th>
                            <th className="text-left px-3 py-2 font-medium">Variance</th>
                            <th className="text-left px-3 py-2 font-medium">Context</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {VISUAL_OUTLIERS.map((row) => (
                            <tr key={`${row.metric}-${row.week}`} className="align-top">
                              <td className="px-3 py-2 text-vintage-black">{row.metric}</td>
                              <td className="px-3 py-2 text-vintage-gray-700">{row.week}</td>
                              <td className="px-3 py-2 text-indigo-700 font-medium">{row.variance}</td>
                              <td className="px-3 py-2 text-vintage-gray-600">{row.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
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
                                <span className="font-semibold">{source.system}</span> - {source.label}
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
              <form className="flex items-center gap-2 sm:gap-3" onSubmit={handleSubmit}>
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
