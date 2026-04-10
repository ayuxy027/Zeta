import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Hash, Mail, FileText, Mic, 
  MessageSquare, Settings, 
  TrendingUp, Users, Database, Layers,
  ChevronRight, Activity, Clock, AlertCircle
} from 'lucide-react';
import { authConfig } from '../auth/config';

type StatsData = {
  counts: { decisions: number; people: number; topics: number; sources: number };
  decisions: { decision: string; people: string[]; topics: string[]; source: string; when: string }[];
  distribution: Record<string, number>;
};

const SOURCE_COLORS: Record<string, string> = {
  slack: '#a855f7',
  gmail: '#ef4444', 
  drive: '#3b82f6',
  meeting: '#f59e0b',
};

const SOURCE_LABELS: Record<string, string> = {
  slack: 'Slack', gmail: 'Gmail', drive: 'Drive', meeting: 'Meeting',
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
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

  const kpis = stats ? [
    { label: 'Decisions Tracked', value: stats.counts.decisions, sub: 'from knowledge graph', icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Sources Indexed', value: stats.counts.sources, sub: 'Slack + Gmail + Drive', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'People Identified', value: stats.counts.people, sub: 'auto-extracted', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Topics Extracted', value: stats.counts.topics, sub: 'via LLM extraction', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ] : [
    { label: 'Decisions Tracked', value: '-', sub: 'loading...', icon: Database, color: 'text-gray-400', bg: 'bg-gray-50' },
    { label: 'Sources Indexed', value: '-', sub: 'loading...', icon: Layers, color: 'text-gray-400', bg: 'bg-gray-50' },
    { label: 'People Identified', value: '-', sub: 'loading...', icon: Users, color: 'text-gray-400', bg: 'bg-gray-50' },
    { label: 'Topics Extracted', value: '-', sub: 'loading...', icon: TrendingUp, color: 'text-gray-400', bg: 'bg-gray-50' },
  ];

  const sourceEntries = stats ? Object.entries(stats.distribution).sort((a, b) => b[1] - a[1]) : [];

  const connectors = [
    { name: 'Slack', value: stats?.distribution.slack ?? 0, color: '#a855f7', connected: true },
    { name: 'Gmail', value: stats?.distribution.gmail ?? 0, color: '#ef4444', connected: true },
    { name: 'Drive', value: stats?.distribution.drive ?? 0, color: '#3b82f6', connected: true },
    { name: 'Meeting', value: stats?.distribution.meeting ?? 0, color: '#f59e0b', connected: true },
  ];

  const recentDecisions = stats?.decisions.slice(0, 5) ?? [];

  return (
    <div className="min-h-screen bg-vintage-white pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-vintage-black">Dashboard</h1>
          <p className="text-sm text-vintage-gray-500 mt-1">Your organizational memory at a glance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </span>
                {stats && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <Activity className="w-2.5 h-2.5" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-vintage-black">{kpi.value}</p>
              <p className="text-xs text-vintage-gray-500 mt-1">{kpi.label}</p>
              <p className="text-[10px] text-vintage-gray-400">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connectors & Distribution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connectors Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-vintage-black">Connected Sources</h2>
                <span className="flex items-center gap-1.5 text-[11px] text-vintage-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Syncing
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {connectors.map((conn) => (
                  <div key={conn.name} className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
                    <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${conn.color}15` }}>
                      {conn.name === 'Slack' && <Hash className="w-4 h-4" style={{ color: conn.color }} />}
                      {conn.name === 'Gmail' && <Mail className="w-4 h-4" style={{ color: conn.color }} />}
                      {conn.name === 'Drive' && <FileText className="w-4 h-4" style={{ color: conn.color }} />}
                      {conn.name === 'Meeting' && <Mic className="w-4 h-4" style={{ color: conn.color }} />}
                    </div>
                    <p className="text-sm font-medium text-vintage-black">{conn.name}</p>
                    <p className="text-xs text-vintage-gray-500">{conn.value} sources</p>
                    {conn.connected && (
                      <span className="inline-block mt-1 text-[10px] text-emerald-600 font-medium">Connected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Source Distribution */}
            {sourceEntries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-vintage-black mb-4">Source Distribution</h2>
                <div className="space-y-3">
                  {sourceEntries.map(([key, count]) => {
                    const total = Object.values(stats?.distribution ?? {}).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs text-vintage-gray-600 mb-1.5">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS[key] ?? '#94a3b8' }} />
                            {SOURCE_LABELS[key] ?? key}
                          </span>
                          <span className="font-semibold">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: SOURCE_COLORS[key] ?? '#94a3b8' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-vintage-black mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dashboard/chat')}
                  className="w-full flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-vintage-black">Ask a Question</p>
                    <p className="text-[11px] text-vintage-gray-500">Query your knowledge graph</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-vintage-gray-400" />
                </button>

                <button
                  onClick={() => navigate('/connectors')}
                  className="w-full flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-purple-300 hover:bg-purple-50/30 transition group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100">
                    <Settings className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-vintage-black">Manage Connectors</p>
                    <p className="text-[11px] text-vintage-gray-500">Configure data sources</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-vintage-gray-400" />
                </button>
              </div>
            </div>

            {/* Recent Decisions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-vintage-black">Recent Decisions</h2>
                {stats && (
                  <span className="text-[10px] text-vintage-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Live
                  </span>
                )}
              </div>
              
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-2 bg-gray-50 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-red-500 text-xs py-4">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              ) : recentDecisions.length === 0 ? (
                <p className="text-sm text-vintage-gray-400 py-4 text-center">No decisions yet</p>
              ) : (
                <div className="space-y-3">
                  {recentDecisions.map((dec, i) => {
                    const sourceColor = SOURCE_COLORS[dec.source] ?? '#94a3b8';
                    return (
                      <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 hover:bg-gray-100/50 transition">
                        <p className="text-sm text-vintage-black line-clamp-2">{dec.decision}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-vintage-gray-500">{dec.people.join(', ')}</span>
                          <span 
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                            style={{ background: `${sourceColor}15`, color: sourceColor }}
                          >
                            {SOURCE_LABELS[dec.source] ?? dec.source}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;