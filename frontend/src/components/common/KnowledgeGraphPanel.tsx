import React, { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import { X } from 'lucide-react';
import { authConfig } from '../../auth/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  name: string;
  source?: string;
  x?: number; y?: number; vx?: number; vy?: number; fx?: number; fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NodeConnection {
  relType: string;       // MADE, ABOUT, SUPPORTS
  direction: 'out' | 'in';
  peer: GraphNode;
}

interface Props {
  externalData?: GraphData | undefined;
  compact?: boolean;
  title?: string;
}

// ─── Colours ─────────────────────────────────────────────────────────────────

const NODE_COLOR: Record<string, string> = {
  Person: '#4f9eed', Decision: '#f28b22', Topic: '#6dba6d',
  SlackMessage: '#a855f7', Email: '#ef4444', Document: '#60a5fa',
  Meeting: '#f59e0b', Source: '#94a3b8',
};
const NODE_BORDER: Record<string, string> = {
  Person: '#2e7abf', Decision: '#c96a00', Topic: '#3d8f3d',
  SlackMessage: '#7c3aed', Email: '#b91c1c', Document: '#2563eb',
  Meeting: '#d97706', Source: '#64748b',
};
const LINK_COLOR: Record<string, string> = {
  MADE: '#a0aec0', ABOUT: '#68d391', SUPPORTS: '#818cf8',
};

function nodeRadius(label: string) {
  if (label === 'Decision') return 8;
  if (label === 'Person')   return 6;
  return 5;
}

// ─── Component ───────────────────────────────────────────────────────────────

const KnowledgeGraphPanel: React.FC<Props> = ({ externalData, compact = false, title }) => {
  const [fetchedData, setFetchedData] = useState<GraphData | null>(null);
  const [loading, setLoading]         = useState(!externalData);
  const [error, setError]             = useState<string | null>(null);
  const [, setHovered]                  = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [connections, setConnections]   = useState<NodeConnection[]>([]);

  const graphRef     = useRef<ForceGraphMethods<GraphNode, GraphLink>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: compact ? 360 : 480 });

  const data = externalData ?? fetchedData;

  // Fetch full graph (dashboard mode)
  useEffect(() => {
    if (externalData) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${authConfig.backendUrl}/api/graph`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch graph');
        const json = await res.json() as GraphData;
        if (!cancelled) setFetchedData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [externalData]);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = () => compact ? 360 : Math.max(420, Math.round(el.clientWidth * 0.5));
    const obs = new ResizeObserver(() => setDims({ w: el.clientWidth, h: h() }));
    obs.observe(el);
    setDims({ w: el.clientWidth, h: h() });
    return () => obs.disconnect();
  }, [compact]);

  // Zoom-to-fit on load
  useEffect(() => {
    if (data?.nodes.length && graphRef.current)
      setTimeout(() => graphRef.current?.zoomToFit(400, compact ? 24 : 40), 600);
  }, [data, compact]);

  // Compute connections from local graph data — no backend call needed
  const handleNodeClick = useCallback((node: object) => {
    const n = node as GraphNode;
    setSelectedNode(n);

    if (!data) { setConnections([]); return; }

    // Build a node lookup map
    const nodeMap = new Map(data.nodes.map(nd => [nd.id, nd]));

    const conns: NodeConnection[] = [];
    for (const link of data.links) {
      const srcId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
      const tgtId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
      const relType = (link as GraphLink & { type?: string }).type ?? '';

      if (srcId === n.id) {
        const peer = nodeMap.get(tgtId);
        if (peer) conns.push({ relType, direction: 'out', peer });
      } else if (tgtId === n.id) {
        const peer = nodeMap.get(srcId);
        if (peer) conns.push({ relType, direction: 'in', peer });
      }
    }
    setConnections(conns);
  }, [data]);

  // ── Draw node ──
  const drawNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label  = node.label ?? 'Decision';
    const fill   = NODE_COLOR[label]  ?? '#888';
    const border = NODE_BORDER[label] ?? '#555';
    const r  = nodeRadius(label);
    const x  = node.x ?? 0;
    const y  = node.y ?? 0;
    const isSelected = selectedNode?.id === node.id;

    // Selection glow ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = `${fill}40`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = fill;
      ctx.stroke();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.strokeStyle = isSelected ? '#fff' : border;
    ctx.stroke();

    // Label pill below
    const fontSize = Math.max(6, 8 / globalScale);
    const shortName = (node.name ?? '').length > 20
      ? (node.name ?? '').slice(0, 20) + '…'
      : (node.name ?? '');
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const textW = ctx.measureText(shortName).width;
    const padX = fontSize * 0.4;
    const padY = fontSize * 0.25;
    const lx = x;
    const ly = y + r + fontSize * 0.55;
    const pillW = textW + padX * 2;
    const pillH = fontSize + padY * 2;

    ctx.beginPath();
    ctx.roundRect(lx - pillW / 2, ly - padY, pillW, pillH, pillH / 2);
    ctx.fillStyle = isSelected ? `${fill}cc` : 'rgba(13,16,23,0.82)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(shortName, lx, ly);
  }, [selectedNode]);

  const linkColor          = useCallback((l: GraphLink) => LINK_COLOR[(l as GraphLink & { type?: string }).type ?? ''] ?? '#4a5568', []);
  const nodeCanvasObjectMode = useCallback(() => 'replace' as const, []);

  // ── Empty / loading / error ──
  if (loading) return (
    <div className="flex items-center justify-center rounded-xl bg-[#1a1f2e] border border-gray-700" style={{ height: compact ? 200 : 260 }}>
      <div className="text-center">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-gray-400">Loading knowledge graph…</p>
      </div>
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center rounded-xl bg-[#1a1f2e] border border-red-800" style={{ height: compact ? 120 : 160 }}>
      <p className="text-xs text-red-400">Graph unavailable: {error}</p>
    </div>
  );
  if (!data || data.nodes.length === 0) return (
    <div className="flex items-center justify-center rounded-xl bg-[#1a1f2e] border border-gray-700" style={{ height: compact ? 120 : 160 }}>
      <p className="text-xs text-gray-500">No graph data — ingest some content first.</p>
    </div>
  );

  const personCount   = data.nodes.filter(n => n.label === 'Person').length;
  const decisionCount = data.nodes.filter(n => n.label === 'Decision').length;
  const topicCount    = data.nodes.filter(n => n.label === 'Topic').length;
  const sourceCount   = data.nodes.filter(n => !['Person','Decision','Topic'].includes(n.label)).length;

  const legendEntries = [
    { label: 'Person',   color: NODE_COLOR.Person },
    { label: 'Decision', color: NODE_COLOR.Decision },
    { label: 'Topic',    color: NODE_COLOR.Topic },
    ...(sourceCount > 0 ? [{ label: 'Source', color: NODE_COLOR.SlackMessage }] : []),
  ];

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-gray-700 overflow-hidden">

      {/* Header */}
      <div className={`flex items-center justify-between border-b border-gray-700 ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}>
        <div>
          <h2 className={`font-semibold text-white tracking-tight ${compact ? 'text-sm' : 'text-base'}`}>
            {title ?? 'Knowledge Graph'}
          </h2>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {data.nodes.length} nodes · {data.links.length} relationships
            {selectedNode ? ' · click node for details' : ' · click any node'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {legendEntries.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Stats bar (full mode only) */}
      {!compact && (
        <div className="flex items-center gap-6 px-5 py-2.5 bg-[#141824] border-b border-gray-800">
          {[
            { count: personCount,   label: 'People',    color: NODE_COLOR.Person },
            { count: decisionCount, label: 'Decisions', color: NODE_COLOR.Decision },
            { count: topicCount,    label: 'Topics',    color: NODE_COLOR.Topic },
          ].map(({ count, label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color }}>{count}</span>
              <span className="text-[11px] text-gray-500">{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live from Neo4j
          </div>
        </div>
      )}

      {/* Graph + detail panel side by side */}
      <div className="relative flex" ref={containerRef}>

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <ForceGraph2D
            ref={graphRef}
            graphData={data}
            width={selectedNode ? Math.max(200, dims.w - 260) : dims.w}
            height={dims.h}
            backgroundColor="#1a1f2e"
            nodeId="id"
            nodeCanvasObject={drawNode}
            nodeCanvasObjectMode={nodeCanvasObjectMode}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius(node.label) + 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            onNodeHover={(node) => setHovered(node as GraphNode | null)}
            onNodeClick={handleNodeClick}
            linkColor={linkColor}
            linkWidth={1.4}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={linkColor}
            cooldownTicks={120}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
            enableNodeDrag
            enableZoomInteraction
            minZoom={0.4}
            maxZoom={6}
          />
        </div>

        {/* Detail panel — slides in when a node is selected */}
        {selectedNode && (
          <div
            className="w-56 flex-shrink-0 bg-[#0f1320] border-l border-gray-700 flex flex-col overflow-y-auto"
            style={{ height: dims.h }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: NODE_COLOR[selectedNode.label] ?? '#888' }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    {selectedNode.label}
                  </p>
                  <p className="text-xs font-semibold text-white truncate">
                    {selectedNode.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedNode(null); setConnections([]); }}
                className="w-5 h-5 flex-shrink-0 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-700 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Connections list */}
            <div className="flex-1 px-3 py-3 text-xs">
              <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-2">
                {connections.length} connection{connections.length !== 1 ? 's' : ''}
              </p>

              {connections.length === 0 ? (
                <p className="text-gray-600 italic">No connections in this graph.</p>
              ) : (
                <div className="space-y-2">
                  {connections.map((c, i) => (
                    <div key={i} className="rounded-lg border border-gray-800 bg-[#141824] p-2">
                      {/* Relation badge + direction */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {c.direction === 'out' ? (
                          <>
                            <span className="text-gray-600 text-[9px] font-mono">THIS</span>
                            <span className="text-gray-600">→</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                              style={{ background: `${LINK_COLOR[c.relType] ?? '#94a3b8'}22`, color: LINK_COLOR[c.relType] ?? '#94a3b8' }}>
                              {c.relType}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                              style={{ background: `${LINK_COLOR[c.relType] ?? '#94a3b8'}22`, color: LINK_COLOR[c.relType] ?? '#94a3b8' }}>
                              {c.relType}
                            </span>
                            <span className="text-gray-600">←</span>
                            <span className="text-gray-600 text-[9px] font-mono">THIS</span>
                          </>
                        )}
                      </div>
                      {/* Peer node */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: NODE_COLOR[c.peer.label] ?? '#888' }} />
                        <div className="min-w-0">
                          <p className="text-[9px] text-gray-500 uppercase tracking-wider">{c.peer.label}</p>
                          <p className="text-gray-200 leading-snug break-words">
                            {c.peer.name.length > 50 ? c.peer.name.slice(0, 50) + '…' : c.peer.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-[#141824]">
        <p className="text-[10px] text-gray-600">
          Click node to see connections · Drag to reposition · Scroll to zoom
        </p>
      </div>
    </div>
  );
};

export default KnowledgeGraphPanel;
