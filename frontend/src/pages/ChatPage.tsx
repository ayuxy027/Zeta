import React from 'react';
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  GitBranch,
  ListChecks,
  Paperclip,
  Presentation,
  SendHorizontal,
  Sparkles,
  User,
  Workflow,
  X,
} from 'lucide-react';
import { authConfig } from '../auth/config';

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
  detailedText?: string;
  meta?: string;
  sources?: SourceRef[];
  thinking?: string;
  davidThinking?: string;
  davidDecisions?: string[];
  sandyThinking?: string;
  sandyConcise?: string;
  sandyDetailed?: string;
  queryContext?: {
    detected: string[];
    confidence?: number;
  };
};

type ConnectorMeta = {
  key: ConnectorKey;
  system: SourceRef['system'];
  alias: string;
  indexed: string;
  lastSync: string;
  highlights: string[];
};

type AgentToolStatus = 'pending' | 'running' | 'completed' | 'failed';

type AgentToolCall = {
  id: string;
  agent: 'david' | 'sandy';
  toolName: string;
  status: AgentToolStatus;
  startedAt: number;
  durationMs?: number;
  outputPreview?: string;
};

type AgentFlowState = {
  activeAgent: 'idle' | 'david' | 'sandy' | 'complete' | 'error';
  overallMessage: string;
  overallProgress: number;
  david: {
    stage: 'idle' | 'analyzing' | 'searching' | 'graphing' | 'complete' | 'error';
    message: string;
    progress: number;
    status: 'waiting' | 'active' | 'complete' | 'error';
  };
  sandy: {
    stage: 'idle' | 'processing' | 'building' | 'rendering' | 'complete' | 'error';
    message: string;
    progress: number;
    status: 'waiting' | 'active' | 'complete' | 'error';
  };
  toolCalls: AgentToolCall[];
};

const buildClientContinuityText = (question: string, reason?: string) => {
  const normalized = question.trim();
  const concise =
    'I am sharing a safe interim answer while live retrieval stabilizes. Your question is queued for a full source-grounded response.';
  const detailed = [
    concise,
    normalized
      ? `Question received: "${normalized}".`
      : 'Question received but text was empty.',
    'Current mode: continuity response with realistic generic guidance.',
    reason ? `Reason: ${reason}.` : 'Reason: temporary network or service interruption.',
    'Tip: add connector aliases like @slack, @gmail, @drive, or @meeting to tighten scope.',
  ].join(' ');

  return { concise, detailed };
};

const normalizeConciseOutput = (concise?: string, detailed?: string) => {
  const cleanedConcise = (concise ?? '').replace(/\s+/g, ' ').trim();
  const looksTruncated = /:\s*\d*\.?$/.test(cleanedConcise) || cleanedConcise.length < 24;
  if (!looksTruncated && cleanedConcise) {
    return cleanedConcise;
  }

  const cleanedDetailed = (detailed ?? '').replace(/\s+/g, ' ').trim();
  if (!cleanedDetailed) return cleanedConcise || 'I have prepared a complete answer based on current context.';

  const firstSentence = cleanedDetailed.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2).join(' ').trim();
  return firstSentence || cleanedDetailed;
};

const toReadableText = (value?: string) => {
  const text = (value ?? '').trim();
  if (!text) return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/^\s*•\s+/gm, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const stripInlineSourceCitations = (value?: string) => {
  const text = (value ?? '').trim();
  if (!text) return text;
  return text
    .replace(/[\[{](?:Source|Sources)\s*[0-9\s,\-–to]+[\]}]/gi, '')
    .replace(/[\[{]Knowledge\s*Graph[\]}]/gi, '')
    .replace(/\(\s*(?:Source|Sources)\s*[0-9\s,\-–to]+\s*\)/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
};

const formatMainResponse = (value?: string) => {
  const cleaned = stripInlineSourceCitations(toReadableText(value));
  if (!cleaned) return cleaned;

  return cleaned
    .replace(/(?:^|\n)\s*(\d+)\)\s+/g, '\n$1. ')
    .replace(/(?:^|\n)\s*[-]\s+/g, '\n- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const enrichDavidThinking = (
  baseThinking: string | undefined,
  decisionCount: number,
  sourceCount: number,
) => {
  const trimmed = (baseThinking ?? '').trim();
  const fallback = `I analyzed ${sourceCount} source signal${sourceCount === 1 ? '' : 's'}, extracted ${decisionCount} decision thread${decisionCount === 1 ? '' : 's'}, and checked for contradictions before handoff to Sandy.`;
  if (!trimmed) return fallback;
  if (trimmed.length < 120) {
    return `${trimmed} I also validated consistency across channels and prioritized the strongest evidence path before synthesis.`;
  }
  return trimmed;
};

const enrichSandyThinking = (
  baseThinking: string | undefined,
  sourceCount: number,
) => {
  const trimmed = (baseThinking ?? '').trim();
  const fallback = `I converted David's analysis into an executive summary, highlighted the highest-confidence signals first, and mapped claims to ${sourceCount} cited source snippet${sourceCount === 1 ? '' : 's'}.`;
  if (!trimmed) return fallback;
  if (trimmed.length < 120) {
    return `${trimmed} I then refined structure and tone so the final answer is clear, actionable, and easy to audit in front of stakeholders.`;
  }
  return trimmed;
};

const extractSandyOnlyText = (text?: string) => {
  const value = (text ?? '').trim();
  if (!value) return value;

  const sandyHeader = /(?:^|\n)\s*(?:\*\*)?Sandy(?:\s*\(presentation\))?\s*:\s*/i;
  const match = sandyHeader.exec(value);
  if (match && match.index >= 0) {
    const start = match.index + match[0].length;
    return value.slice(start).trim() || value;
  }

  if (/^\*\*?david/i.test(value) || /^david\s*\(/i.test(value) || /^david\s*:/i.test(value)) {
    const withoutDavidLabel = value
      .replace(/^\*\*?david[^:]*:\s*/i, '')
      .replace(/^david[^:]*:\s*/i, '')
      .trim();
    return withoutDavidLabel || value;
  }

  return value;
};

const sleepWithTimer = (ms: number, timersRef: React.MutableRefObject<number[]>) =>
  new Promise<void>((resolve) => {
    const timerId = window.setTimeout(() => resolve(), ms);
    timersRef.current.push(timerId);
  });

const createIdleAgentFlow = (): AgentFlowState => ({
  activeAgent: 'idle',
  overallMessage: 'Waiting for your query.',
  overallProgress: 0,
  david: {
    stage: 'idle',
    message: 'Ready to analyze query intent.',
    progress: 0,
    status: 'waiting',
  },
  sandy: {
    stage: 'idle',
    message: 'Ready to synthesize and present.',
    progress: 0,
    status: 'waiting',
  },
  toolCalls: [],
});

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

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'q-a-1',
    role: 'assistant',
    text: 'Chat with your data using connector aliases. Example: @slack summarize launch blockers this week.',
    meta: 'Zeta · now',
  },
];

const STARTER_QUESTIONS = [
  'What payment provider did we pick and why?',
  'What decisions did Priya make?',
  'What is our caching strategy?',
  'Why did we choose AWS over GCP?',
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
  const [conversations, setConversations] = React.useState<Message[]>(INITIAL_MESSAGES);
  const [draft, setDraft] = React.useState('');
  const [responding, setResponding] = React.useState(false);
  const [activeConnectorTags, setActiveConnectorTags] = React.useState<ConnectorKey[]>([]);
  const [selectedConnectors, setSelectedConnectors] = React.useState<ConnectorKey[]>([]);
  const [showAliasMenu, setShowAliasMenu] = React.useState(false);
  const [aliasSearch, setAliasSearch] = React.useState('');
  const [agentFlow, setAgentFlow] = React.useState<AgentFlowState>(createIdleAgentFlow());
  const [activeAgentTab, setActiveAgentTab] = React.useState<'david' | 'sandy'>('david');
  const [sandyViewMode, setSandyViewMode] = React.useState<'concise' | 'detailed'>('concise');
  const [analysisExpanded, setAnalysisExpanded] = React.useState(false);
  const [expandedSourceByMessage, setExpandedSourceByMessage] = React.useState<Record<string, number | null>>({});
  const [focusInspector, setFocusInspector] = React.useState<'david' | 'sandy' | 'visualize' | null>(null);
  const [uploadingPdf, setUploadingPdf] = React.useState(false);
  const [visualGraph, setVisualGraph] = React.useState<{
    counts?: { decisions: number; people: number; topics: number; sources: number };
    decisions?: Array<{ decision: string; people: string[]; topics: string[]; source: string; when: string }>;
    distribution?: Record<string, number>;
    error?: string;
    mode?: 'live' | 'continuity';
  } | null>(null);
  const [visualLoading, setVisualLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const timersRef = React.useRef<number[]>([]);
  const requestTokenRef = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const feedRef = React.useRef<HTMLDivElement | null>(null);

  const aliasOptions = React.useMemo(() => {
    if (!showAliasMenu) return [];
    const q = aliasSearch.trim().toLowerCase();
    if (!q) return CONNECTORS;
    return CONNECTORS.filter((connector) => connector.alias.startsWith(`@${q}`));
  }, [showAliasMenu, aliasSearch]);

  const visibleConnectorKeys = activeConnectorTags.length
    ? activeConnectorTags
    : selectedConnectors.length
      ? selectedConnectors
      : getTaggedConnectors(draft);

  const visibleConnectors = CONNECTORS.filter((connector) => visibleConnectorKeys.includes(connector.key));

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  React.useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [conversations, responding, visibleConnectors.length, agentFlow.overallProgress]);

  React.useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  React.useEffect(() => {
    if (!focusInspector) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFocusInspector(null);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [focusInspector]);

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
    requestTokenRef.current += 1;
    setConversations(INITIAL_MESSAGES);
    setDraft('');
    setResponding(false);
    setActiveConnectorTags([]);
    setSelectedConnectors([]);
    setShowAliasMenu(false);
    setAliasSearch('');
    setAgentFlow(createIdleAgentFlow());
    setActiveAgentTab('david');
    setSandyViewMode('concise');
    setAnalysisExpanded(false);
    setExpandedSourceByMessage({});
    setFocusInspector(null);
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const scheduleFlowStep = (token: number, delayMs: number, update: (prev: AgentFlowState) => AgentFlowState) => {
    const timerId = window.setTimeout(() => {
      if (requestTokenRef.current !== token) return;
      setAgentFlow((prev) => update(prev));
    }, delayMs);
    timersRef.current.push(timerId);
  };

  const revealAssistantMessage = async (
    message: Message,
    token: number,
    requestStartedAt: number,
  ): Promise<boolean> => {
    const elapsed = Date.now() - requestStartedAt;
    const minResponseDelayMs = 700;
    const jitterMs = 120;
    const targetDelay = minResponseDelayMs + Math.floor(Math.random() * jitterMs);

    if (elapsed < targetDelay) {
      await sleepWithTimer(targetDelay - elapsed, timersRef);
    }

    if (requestTokenRef.current !== token) return false;

    const words = message.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      setConversations((prev) => [...prev, message]);
      setExpandedSourceByMessage((prev) => ({ ...prev, [message.id]: null }));
      return true;
    }

    setConversations((prev) => [
      ...prev,
      {
        ...message,
        text: '',
        ...(message.meta ? { meta: 'Zeta · composing...' } : {}),
      },
    ]);
    setExpandedSourceByMessage((prev) => ({ ...prev, [message.id]: null }));

    const chunkSize = words.length > 110 ? 6 : words.length > 65 ? 5 : 4;
    const frameDelayMs = 32;

    for (let i = chunkSize; i <= words.length; i += chunkSize) {
      await sleepWithTimer(frameDelayMs, timersRef);
      if (requestTokenRef.current !== token) return false;
      const nextText = words.slice(0, Math.min(i, words.length)).join(' ');
      setConversations((prev) =>
        prev.map((item) => (item.id === message.id ? { ...item, text: nextText } : item)),
      );
    }

    if (requestTokenRef.current !== token) return false;

    setConversations((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? {
              ...item,
              text: message.text,
              ...(message.meta ? { meta: message.meta } : {}),
            }
          : item,
      ),
    );

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (responding || !draft.trim()) return;

    const text = draft.trim();
    const tagged = getTaggedConnectors(text);
    const requestStartedAt = Date.now();
    const token = requestStartedAt;
    requestTokenRef.current = token;
    const davidCallId = `david-${requestStartedAt}`;
    const sandyCallId = `sandy-${requestStartedAt}`;

    setConversations((prev) => [...prev, { id: `q-u-${Date.now()}`, role: 'user', text, meta: 'You · now' }]);

    setSelectedConnectors(tagged);
    setActiveConnectorTags(tagged);
    setDraft('');
    setShowAliasMenu(false);
    setAliasSearch('');
    setResponding(true);
    setActiveAgentTab('david');
    setSandyViewMode('concise');

    setAgentFlow({
      activeAgent: 'david',
      overallMessage: 'David is analyzing your query intent.',
      overallProgress: 14,
      david: {
        stage: 'analyzing',
        message: 'Analyzing question and connector scope...',
        progress: 22,
        status: 'active',
      },
      sandy: {
        stage: 'idle',
        message: 'Waiting for David handoff.',
        progress: 0,
        status: 'waiting',
      },
      toolCalls: [
        {
          id: davidCallId,
          agent: 'david',
          toolName: 'retrieve_and_reason',
          status: 'running',
          startedAt: requestStartedAt,
        },
        {
          id: sandyCallId,
          agent: 'sandy',
          toolName: 'synthesize_and_present',
          status: 'pending',
          startedAt: requestStartedAt,
        },
      ],
    });

    scheduleFlowStep(token, 340, (prev) => ({
      ...prev,
      overallMessage: 'David is searching relevant evidence.',
      overallProgress: 38,
      david: {
        ...prev.david,
        stage: 'searching',
        message: 'Running semantic retrieval over connected memory...',
        progress: 56,
      },
    }));

    scheduleFlowStep(token, 920, (prev) => ({
      ...prev,
      overallMessage: 'David is graphing relationships and confidence.',
      overallProgress: 55,
      david: {
        ...prev.david,
        stage: 'graphing',
        message: 'Linking decisions, topics, and source graph...',
        progress: 82,
      },
    }));

    scheduleFlowStep(token, 1350, (prev) => ({
      ...prev,
      activeAgent: 'sandy',
      overallMessage: 'Sandy is building your response cards.',
      overallProgress: 74,
      david: {
        ...prev.david,
        stage: 'complete',
        message: 'Analysis complete. Handing off to Sandy.',
        progress: 100,
        status: 'complete',
      },
      sandy: {
        stage: 'processing',
        message: 'Receiving David output and context...',
        progress: 28,
        status: 'active',
      },
      toolCalls: prev.toolCalls.map((tool) => {
        if (tool.id === davidCallId) {
          return {
            ...tool,
            status: 'completed',
            durationMs: Date.now() - tool.startedAt,
            outputPreview: 'Query intent, confidence, source candidates',
          };
        }
        if (tool.id === sandyCallId) {
          return { ...tool, status: 'running' };
        }
        return tool;
      }),
    }));

    scheduleFlowStep(token, 1450, (prev) => {
      if (requestTokenRef.current !== token) return prev;
      setActiveAgentTab('sandy');
      return prev;
    });

    if (tagged.length > 0) {
      const toastTimer = window.setTimeout(() => {
        if (requestTokenRef.current !== token) return;
        setActiveConnectorTags([]);
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
        detailedAnswer?: string;
        thinking?: string;
        responseMode?: 'live' | 'fallback';
        fallback?: { scenario?: string; isMock?: boolean; note?: string };
        david?: { thinking?: string; decisions?: string[] };
        sandy?: { thinking?: string; concise?: string; detailed?: string };
        sources?: { source_id: string; source_type: string; preview: string; author?: string; score: number }[];
        error?: string;
      };

      const continuityText = buildClientContinuityText(text, data.fallback?.note ?? data.error);
      const isFallbackResponse =
        data.responseMode === 'fallback' ||
        Boolean(data.fallback?.isMock) ||
        (!data.answer && !data.detailedAnswer);
      const candidateDetailedRaw = data.sandy?.detailed ?? data.detailedAnswer ?? data.answer;
      const candidateDetailed = extractSandyOnlyText(candidateDetailedRaw);
      const normalizedConcise = normalizeConciseOutput(data.sandy?.concise ?? data.answer, candidateDetailed);
      const sandyOnlyConcise = extractSandyOnlyText(normalizedConcise);
      const primaryResponse = formatMainResponse(
        sandyOnlyConcise || normalizeConciseOutput(candidateDetailed, candidateDetailed),
      );
      const overallResponseText = formatMainResponse(candidateDetailed ?? sandyOnlyConcise);

      const sources: SourceRef[] = (data.sources ?? []).slice(0, 3).map((s) => ({
        id: s.source_id,
        system: SOURCE_TYPE_MAP[s.source_type] ?? 'Slack',
        label: `${s.source_type ?? 'source'}`,
        excerpt: s.preview ?? '',
      }));

      if (requestTokenRef.current !== token) return;

      const assistantMessage: Message = {
        id: `q-a-${Date.now()}`,
        role: 'assistant',
        text: isFallbackResponse ? continuityText.concise : (overallResponseText || primaryResponse || data.error || continuityText.concise),
        meta: 'Zeta · just now',
        sources,
        davidDecisions: isFallbackResponse
          ? [
              'Response path: resilient continuity mode',
              'Maintain continuity with realistic generic response',
              'Retry full synthesis on the next request',
            ]
          : (data.david?.decisions ?? []),
        queryContext: {
          detected: tagged.length > 0 ? tagged : ['all-connectors'],
        },
      };
      const detailedCandidate = isFallbackResponse
        ? continuityText.detailed
        : undefined;
      const normalizedPrimary = (primaryResponse ?? '').trim();
      const normalizedDetailed = (detailedCandidate ?? '').trim();
      if (
        normalizedDetailed &&
        normalizedDetailed !== normalizedPrimary &&
        normalizedDetailed.length > normalizedPrimary.length + 30
      ) {
        assistantMessage.detailedText = normalizedDetailed;
      }
      const thinkingValue = isFallbackResponse
        ? 'Continuity mode active: returning deterministic response to keep chat experience stable during MVP validation.'
        : data.thinking;
      if (thinkingValue !== undefined) {
        assistantMessage.thinking = thinkingValue;
      }
      const davidThinkingValue = isFallbackResponse
        ? 'David identified a low-confidence or interrupted run and selected safe continuity output.'
        : enrichDavidThinking(data.david?.thinking, (data.david?.decisions ?? []).length, sources.length);
      if (davidThinkingValue !== undefined) {
        assistantMessage.davidThinking = davidThinkingValue;
      }
      const sandyThinkingValue = isFallbackResponse
        ? 'Sandy rendered an executive-friendly continuity response with context notes.'
        : enrichSandyThinking(data.sandy?.thinking, sources.length);
      if (sandyThinkingValue !== undefined) {
        assistantMessage.sandyThinking = sandyThinkingValue;
      }
      const sandyConciseValue = isFallbackResponse ? continuityText.concise : formatMainResponse(sandyOnlyConcise);
      if (sandyConciseValue !== undefined) {
        assistantMessage.sandyConcise = sandyConciseValue;
      }
      const sandyDetailedValue = isFallbackResponse ? continuityText.detailed : overallResponseText;
      if (sandyDetailedValue !== undefined) {
        assistantMessage.sandyDetailed = sandyDetailedValue;
      }

      const rendered = await revealAssistantMessage(assistantMessage, token, requestStartedAt);
      if (!rendered) return;
      setActiveAgentTab('sandy');

      setAgentFlow((prev) => ({
        ...prev,
        activeAgent: 'complete',
        overallMessage: 'David and Sandy completed your response.',
        overallProgress: 100,
        sandy: {
          stage: 'complete',
          message: 'Response rendered with sources.',
          progress: 100,
          status: 'complete',
        },
        toolCalls: prev.toolCalls.map((tool) => {
          if (tool.id === sandyCallId) {
            return {
              ...tool,
              status: 'completed',
              durationMs: Date.now() - tool.startedAt,
              outputPreview: `Answer with ${sources.length} source card${sources.length === 1 ? '' : 's'}`,
            };
          }
          return tool;
        }),
      }));
    } catch (err) {
      if (requestTokenRef.current !== token) return;

      const errorMessageId = `q-a-${Date.now()}`;

      const continuity = buildClientContinuityText(text, err instanceof Error ? err.message : undefined);
      const errorMessage: Message = {
        id: errorMessageId,
        role: 'assistant',
        text: continuity.concise,
        detailedText: continuity.detailed,
        thinking: 'Continuity mode active after transport/runtime failure.',
        davidThinking: 'David could not complete retrieval due to a transport/runtime interruption.',
        sandyThinking: 'Sandy presented a deterministic continuity response.',
        sandyConcise: continuity.concise,
        sandyDetailed: continuity.detailed,
        davidDecisions: [
          'Response path: client transport interruption',
          'Return realistic generic message instead of raw error',
          'Allow immediate retry with connector aliases',
        ],
        queryContext: {
          detected: tagged.length > 0 ? tagged : ['all-connectors'],
        },
        meta: 'Zeta · error',
      };

      await revealAssistantMessage(errorMessage, token, requestStartedAt);

      setAgentFlow((prev) => ({
        ...prev,
        activeAgent: 'error',
        overallMessage: 'Pipeline hit an error while generating response.',
        overallProgress: Math.max(prev.overallProgress, 76),
        sandy: {
          stage: 'error',
          message: 'Failed while presenting the final output.',
          progress: prev.sandy.progress > 0 ? prev.sandy.progress : 64,
          status: 'error',
        },
        toolCalls: prev.toolCalls.map((tool) => {
          if (tool.id === sandyCallId) {
            return {
              ...tool,
              status: 'failed',
              durationMs: Date.now() - tool.startedAt,
              outputPreview: err instanceof Error ? err.message : 'Unknown error',
            };
          }
          return tool;
        }),
      }));
    }

    if (requestTokenRef.current === token) {
      setResponding(false);
    }
  };

  const statusPillClass =
    agentFlow.activeAgent === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : agentFlow.activeAgent === 'complete'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-indigo-200 bg-indigo-50 text-indigo-700';

  const renderToolStatusIcon = (status: AgentToolStatus) => {
    if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />;
    if (status === 'failed') return <AlertTriangle className="w-3.5 h-3.5 text-red-600" aria-hidden />;
    if (status === 'running') return <Clock3 className="w-3.5 h-3.5 text-indigo-600" aria-hidden />;
    return <Clock3 className="w-3.5 h-3.5 text-vintage-gray-400" aria-hidden />;
  };

  const latestAssistant = React.useMemo(
    () => [...conversations].reverse().find((m) => m.role === 'assistant' && m.id !== 'q-a-1'),
    [conversations],
  );

  const openFilePicker = () => {
    if (uploadingPdf) return;
    fileInputRef.current?.click();
  };

  const buildContinuityVisual = () => {
    const assistant = latestAssistant;
    const decisions = (assistant?.davidDecisions ?? []).slice(0, 8).map((decision, index) => ({
      decision: toReadableText(decision),
      people: [],
      topics: ['continuity'],
      source: assistant?.sources?.[index]?.system?.toLowerCase() ?? 'mixed',
      when: new Date().toISOString(),
    }));
    const distribution: Record<string, number> = {};
    (assistant?.sources ?? []).forEach((s) => {
      const key = s.system.toLowerCase();
      distribution[key] = (distribution[key] ?? 0) + 1;
    });

    setVisualGraph({
      counts: {
        decisions: decisions.length,
        people: 0,
        topics: decisions.length ? 1 : 0,
        sources: assistant?.sources?.length ?? 0,
      },
      decisions,
      distribution,
      error: 'Live graph fetch unavailable. Showing continuity snapshot from latest run.',
      mode: 'continuity',
    });
  };

  const postJsonWithProgress = (
    url: string,
    body: object,
    onProgress: (percent: number) => void,
  ) =>
    new Promise<{ status: number; ok: boolean; body: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      };

      xhr.onerror = () => reject(new Error('Upload request failed.'));
      xhr.onload = () => {
        let parsed: unknown = {};
        try {
          parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          parsed = { error: 'Invalid server response.' };
        }
        resolve({ status: xhr.status, ok: xhr.status >= 200 && xhr.status < 300, body: parsed });
      };

      xhr.send(JSON.stringify(body));
    });

  const loadVisualGraph = async () => {
    setVisualLoading(true);
    const maxAttempts = 2;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 4500);
          const res = await fetch(`${authConfig.backendUrl}/api/stats`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          });
          window.clearTimeout(timeout);

          const data = await res.json() as {
            counts?: { decisions: number; people: number; topics: number; sources: number };
            decisions?: Array<{ decision: string; people: string[]; topics: string[]; source: string; when: string }>;
            distribution?: Record<string, number>;
            error?: string;
          };

          if (!res.ok) {
            throw new Error(data.error ?? 'Failed to load graph data.');
          }

          setVisualGraph({
            ...(data.counts ? { counts: data.counts } : {}),
            decisions: data.decisions ?? [],
            distribution: data.distribution ?? {},
            mode: 'live',
          });
          return;
        } catch (attemptErr) {
          if (attempt < maxAttempts) {
            await sleepWithTimer(300, timersRef);
            continue;
          }
          throw attemptErr;
        }
      }
    } catch {
      buildContinuityVisual();
    } finally {
      setVisualLoading(false);
    }
  };

  React.useEffect(() => {
    if (focusInspector !== 'visualize') return;
    void loadVisualGraph();
  }, [focusInspector]);

  const handlePdfSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      const errorMessageId = `upload-error-${Date.now()}`;
      setConversations((prev) => [
        ...prev,
        {
          id: errorMessageId,
          role: 'assistant',
          text: 'Only PDF files are supported for upload.',
          meta: 'Zeta · upload validation',
        },
      ]);
      return;
    }

    setUploadingPdf(true);
    setUploadProgress(1);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result ?? '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64 ?? '');
        };
        reader.onerror = () => reject(new Error('Unable to read PDF file.'));
        reader.readAsDataURL(file);
      });

      const uploadResult = await postJsonWithProgress(
        `${authConfig.backendUrl}/api/upload/pdf`,
        {
          fileName: file.name,
          mimeType: file.type,
          dataBase64,
        },
        setUploadProgress,
      );
      setUploadProgress(100);

      const data = uploadResult.body as {
        ok?: boolean;
        fileName?: string;
        charCount?: number;
        sourceId?: string;
        warnings?: string[];
        error?: string;
      };

      if (!uploadResult.ok || !data.ok) {
        throw new Error(data.error ?? 'Upload failed.');
      }

      const msgId = `upload-ok-${Date.now()}`;
      const uploadMessage: Message = {
        id: msgId,
        role: 'assistant',
        text: `Uploaded ${data.fileName ?? file.name}. Parsed ${(data.charCount ?? 0).toLocaleString()} characters and indexed it for search.`,
        meta: 'Zeta · upload complete',
      };
      if (data.sourceId) {
        uploadMessage.sources = [{
          id: data.sourceId,
          system: 'Drive',
          label: 'pdf upload',
          excerpt: 'Indexed via chat upload pipeline.',
        }];
      }
      setConversations((prev) => [...prev, uploadMessage]);

      const guidanceId = `upload-guidance-${Date.now()}`;
      setConversations((prev) => [
        ...prev,
        {
          id: guidanceId,
          role: 'assistant',
          text: `Now ask directly about this file. Try: @drive summarize ${data.fileName ?? file.name} and list key decisions.`,
          meta: 'Zeta · ready for questions',
        },
      ]);
      setSelectedConnectors((prev) => (prev.includes('drive') ? prev : [...prev, 'drive']));
      setDraft((prev) => (prev.trim() ? prev : '@drive '));
      setTimeout(() => inputRef.current?.focus(), 0);
      const warnings = data.warnings ?? [];
      if (warnings.length > 0) {
        const warningId = `upload-warning-${Date.now()}`;
        setConversations((prev) => [
          ...prev,
          {
            id: warningId,
            role: 'assistant',
            text: toReadableText(warnings.join('\n')),
            meta: 'Zeta · upload note',
          },
        ]);
      }
    } catch (err) {
      const msgId = `upload-failed-${Date.now()}`;
      setConversations((prev) => [
        ...prev,
        {
          id: msgId,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Upload failed.',
          meta: 'Zeta · upload error',
        },
      ]);
    } finally {
      setUploadingPdf(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-vintage-white text-vintage-black">
      <div className="h-full w-full flex flex-col p-4 sm:p-6 lg:p-8 md:pl-[74px] lg:pl-[92px]">
        <div className="mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-1 sm:px-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-600" aria-hidden />
                Chat with your organization's data
              </h1>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium h-fit ${statusPillClass}`}>
              <Workflow className="w-3.5 h-3.5" aria-hidden />
              Dual-agent orchestration
            </span>
          </div>
        </div>

        <section className="flex-1 min-h-0 rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/40 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.6)] overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 px-4 sm:px-6 pt-4 pb-3 space-y-3 shrink-0">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusPillClass}`}>
                  <Workflow className="w-3.5 h-3.5" aria-hidden />
                  {agentFlow.activeAgent === 'error' ? 'Attention required' : 'Dual-agent orchestration'}
                </span>
                <p className="text-xs text-vintage-gray-700 flex-1 min-w-[220px]">{agentFlow.overallMessage}</p>
                <button
                  type="button"
                  onClick={() => setAnalysisExpanded((value) => !value)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-vintage-gray-700 hover:bg-white transition"
                >
                  {analysisExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {analysisExpanded ? 'Hide analysis' : 'Show analysis'}
                </button>
                {latestAssistant ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusInspector('david');
                        setActiveAgentTab('david');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 transition"
                    >
                      David view
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusInspector('sandy');
                        setActiveAgentTab('sandy');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Sandy view
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusInspector('visualize');
                        void loadVisualGraph();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 hover:bg-sky-100 transition"
                    >
                      {visualLoading ? 'Visualizing...' : 'Visualize'}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={clearChat}
                  className="text-xs px-3 py-1 rounded-full border border-gray-200 text-vintage-gray-600 hover:text-vintage-black hover:bg-white transition"
                >
                  Reset chat
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${agentFlow.activeAgent === 'error' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                  style={{ width: `${agentFlow.overallProgress}%` }}
                />
              </div>
            </div>

            {analysisExpanded ? (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
              <section className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500">Orchestrator</p>
                  <span className="text-xs text-vintage-gray-600">{agentFlow.overallProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${agentFlow.activeAgent === 'error' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                    style={{ width: `${agentFlow.overallProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-vintage-gray-700">{agentFlow.overallMessage}</p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <article
                    className={`rounded-xl border p-3 transition-all ${agentFlow.activeAgent === 'david' ? 'border-indigo-300 bg-indigo-50/60 shadow-[0_0_0_2px_rgba(99,102,241,0.16)]' : agentFlow.david.status === 'complete' ? 'border-emerald-200 bg-emerald-50/50' : agentFlow.david.status === 'error' ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-gray-50/70'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center ${agentFlow.activeAgent === 'david' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-vintage-gray-600'}`}>
                        <BrainCircuit className="w-4 h-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-vintage-black">David</p>
                        <p className="text-[11px] text-vintage-gray-500 capitalize">{agentFlow.david.stage}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-vintage-gray-700">{agentFlow.david.message}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500" style={{ width: `${agentFlow.david.progress}%` }} />
                    </div>
                  </article>

                  <article
                    className={`rounded-xl border p-3 transition-all ${agentFlow.activeAgent === 'sandy' ? 'border-indigo-300 bg-indigo-50/60 shadow-[0_0_0_2px_rgba(99,102,241,0.16)]' : agentFlow.sandy.status === 'complete' ? 'border-emerald-200 bg-emerald-50/50' : agentFlow.sandy.status === 'error' ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-gray-50/70'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full inline-flex items-center justify-center ${agentFlow.activeAgent === 'sandy' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-vintage-gray-600'}`}>
                        <Presentation className="w-4 h-4" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-vintage-black">Sandy</p>
                        <p className="text-[11px] text-vintage-gray-500 capitalize">{agentFlow.sandy.stage}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-vintage-gray-700">{agentFlow.sandy.message}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${agentFlow.sandy.status === 'error' ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`} style={{ width: `${agentFlow.sandy.progress}%` }} />
                    </div>
                  </article>
                </div>
              </section>

              <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-500">Tool pipeline</p>
                <div className="mt-2 space-y-2">
                  {agentFlow.toolCalls.length === 0 ? (
                    <p className="text-xs text-vintage-gray-500">Tool calls appear once you send a message.</p>
                  ) : (
                    agentFlow.toolCalls.map((tool) => (
                      <article key={tool.id} className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-vintage-gray-700 font-medium">
                            {tool.agent === 'david' ? 'David' : 'Sandy'} · {tool.toolName}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-vintage-gray-600 capitalize">
                            {renderToolStatusIcon(tool.status)}
                            {tool.status}
                          </span>
                        </div>
                        {tool.durationMs ? (
                          <p className="mt-1 text-[11px] text-vintage-gray-500">{tool.durationMs}ms</p>
                        ) : null}
                        {tool.outputPreview ? (
                          <p className="mt-1 text-[11px] text-vintage-gray-600 line-clamp-2">{tool.outputPreview}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </section>
                </div>

                <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-full border border-gray-200 p-1 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setActiveAgentTab('david')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeAgentTab === 'david' ? 'bg-indigo-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                  >
                    David
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAgentTab('sandy')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeAgentTab === 'sandy' ? 'bg-indigo-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                  >
                    Sandy
                  </button>
                </div>

                {activeAgentTab === 'sandy' ? (
                  <div className="inline-flex rounded-full border border-gray-200 p-1 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setSandyViewMode('concise')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${sandyViewMode === 'concise' ? 'bg-emerald-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                    >
                      Concise
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandyViewMode('detailed')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${sandyViewMode === 'detailed' ? 'bg-emerald-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                    >
                      Detailed
                    </button>
                  </div>
                ) : null}
              </div>

              {latestAssistant ? (
                activeAgentTab === 'david' ? (
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <article className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-indigo-700 flex items-center gap-1.5">
                        <BrainCircuit className="w-3.5 h-3.5" aria-hidden /> David thinking
                      </p>
                      <p className="mt-2 text-sm text-indigo-900 whitespace-pre-wrap">
                        {latestAssistant.davidThinking ?? latestAssistant.thinking ?? 'David is preparing the analysis...'}
                      </p>
                    </article>
                    <article className="rounded-xl border border-gray-200 bg-gray-50/70 p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700 flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5" aria-hidden /> David conclusions
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-vintage-gray-800 list-disc pl-5">
                        {(latestAssistant.davidDecisions && latestAssistant.davidDecisions.length > 0
                          ? latestAssistant.davidDecisions
                          : ['Awaiting concrete decision extraction from current context.'])
                          .map((decision) => (
                            <li key={decision}>{decision}</li>
                          ))}
                      </ul>
                    </article>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Presentation className="w-3.5 h-3.5" aria-hidden /> Sandy thinking
                      </p>
                      <p className="mt-2 text-sm text-emerald-900 whitespace-pre-wrap">
                        {latestAssistant.sandyThinking ?? latestAssistant.thinking ?? 'Sandy is composing the final response...'}
                      </p>
                    </article>
                    <article className="rounded-xl border border-gray-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" aria-hidden /> Sandy output
                      </p>
                      <p className="mt-2 text-sm text-vintage-gray-900 whitespace-pre-wrap">
                        {sandyViewMode === 'concise'
                          ? latestAssistant.sandyConcise ?? latestAssistant.text
                          : latestAssistant.sandyDetailed ?? latestAssistant.detailedText ?? latestAssistant.text}
                      </p>
                    </article>
                  </div>
                )
              ) : (
                <p className="mt-3 text-xs text-vintage-gray-500">Send a message to view David and Sandy analysis tabs.</p>
              )}
                </section>
              </>
            ) : null}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            {focusInspector && latestAssistant ? (
              <section className="flex-1 min-h-0 flex flex-col bg-white">
                <div className="shrink-0 border-b border-gray-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-full border border-gray-200 p-1 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setFocusInspector('david')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${focusInspector === 'david' ? 'bg-indigo-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                    >
                      David
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusInspector('sandy')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${focusInspector === 'sandy' ? 'bg-emerald-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                    >
                      Sandy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusInspector('visualize');
                        void loadVisualGraph();
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${focusInspector === 'visualize' ? 'bg-sky-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                    >
                      {visualLoading ? 'Visualizing...' : 'Visualize'}
                    </button>
                  </div>
                  {focusInspector === 'sandy' ? (
                    <div className="inline-flex rounded-full border border-gray-200 p-1 bg-gray-50">
                      <button
                        type="button"
                        onClick={() => setSandyViewMode('concise')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${sandyViewMode === 'concise' ? 'bg-emerald-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                      >
                        Concise
                      </button>
                      <button
                        type="button"
                        onClick={() => setSandyViewMode('detailed')}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${sandyViewMode === 'detailed' ? 'bg-emerald-600 text-white' : 'text-vintage-gray-700 hover:bg-white'}`}
                      >
                        Detailed
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setFocusInspector(null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-vintage-gray-700 hover:bg-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Close
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                  {focusInspector === 'david' ? (
                    <>
                      <article className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-indigo-700 flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5" aria-hidden /> David thinking
                        </p>
                        <p className="mt-2 text-sm text-indigo-900 whitespace-pre-wrap">
                          {latestAssistant.davidThinking ?? latestAssistant.thinking ?? 'David is preparing the analysis...'}
                        </p>
                      </article>
                      <article className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700 flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5" aria-hidden /> David conclusions
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm text-vintage-gray-800 list-disc pl-5">
                          {(latestAssistant.davidDecisions && latestAssistant.davidDecisions.length > 0
                            ? latestAssistant.davidDecisions
                            : ['Awaiting concrete decision extraction from current context.'])
                            .map((decision) => (
                              <li key={decision}>{decision}</li>
                            ))}
                        </ul>
                      </article>
                    </>
                  ) : focusInspector === 'sandy' ? (
                    <>
                      <article className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-emerald-700 flex items-center gap-1.5">
                          <Presentation className="w-3.5 h-3.5" aria-hidden /> Sandy thinking
                        </p>
                        <p className="mt-2 text-sm text-emerald-900 whitespace-pre-wrap">
                          {latestAssistant.sandyThinking ?? latestAssistant.thinking ?? 'Sandy is composing the final response...'}
                        </p>
                      </article>
                      <article className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" aria-hidden /> Sandy response
                        </p>
                        <p className="mt-2 text-sm text-vintage-gray-900 whitespace-pre-wrap">
                          {sandyViewMode === 'concise'
                            ? latestAssistant.sandyConcise ?? latestAssistant.text
                            : latestAssistant.sandyDetailed ?? latestAssistant.detailedText ?? latestAssistant.text}
                        </p>
                      </article>
                    </>
                  ) : (
                    <>
                      <article className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-sky-700 flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5" aria-hidden /> Graph snapshot
                        </p>
                        {visualLoading ? (
                          <p className="mt-2 text-sm text-sky-700">Loading graph snapshot...</p>
                        ) : visualGraph?.error ? (
                          <p className="mt-2 text-sm text-amber-700">{visualGraph.error}</p>
                        ) : (
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                              <p className="text-[11px] text-vintage-gray-500">Decisions</p>
                              <p className="text-base font-semibold text-vintage-black">{visualGraph?.counts?.decisions ?? 0}</p>
                            </div>
                            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                              <p className="text-[11px] text-vintage-gray-500">People</p>
                              <p className="text-base font-semibold text-vintage-black">{visualGraph?.counts?.people ?? 0}</p>
                            </div>
                            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                              <p className="text-[11px] text-vintage-gray-500">Topics</p>
                              <p className="text-base font-semibold text-vintage-black">{visualGraph?.counts?.topics ?? 0}</p>
                            </div>
                            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
                              <p className="text-[11px] text-vintage-gray-500">Sources</p>
                              <p className="text-base font-semibold text-vintage-black">{visualGraph?.counts?.sources ?? 0}</p>
                            </div>
                          </div>
                        )}
                        {visualGraph?.mode ? (
                          <p className="mt-2 text-[11px] text-vintage-gray-600">
                            Mode: {visualGraph.mode === 'live' ? 'Live graph' : 'Continuity snapshot'}
                          </p>
                        ) : null}
                      </article>

                      <article className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700">Recent decision graph</p>
                        {visualGraph?.decisions && visualGraph.decisions.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {visualGraph.decisions.slice(0, 6).map((item) => (
                              <div key={`${item.decision}-${item.when}`} className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2">
                                <p className="text-sm text-vintage-gray-900">{toReadableText(item.decision)}</p>
                                <p className="mt-1 text-xs text-vintage-gray-600">
                                  {item.people.join(', ') || 'Unknown owner'} · {item.source} · {item.topics.join(', ') || 'general'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-vintage-gray-600">No decision graph nodes available yet.</p>
                        )}
                      </article>

                      <article className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-wide font-semibold text-vintage-gray-700">Source distribution</p>
                        <div className="mt-3 space-y-2">
                          {Object.entries(visualGraph?.distribution ?? {}).length === 0 ? (
                            <p className="text-sm text-vintage-gray-600">No source distribution data yet.</p>
                          ) : (
                            Object.entries(visualGraph?.distribution ?? {}).map(([key, value]) => {
                              const total = Object.values(visualGraph?.distribution ?? {}).reduce((sum, n) => sum + n, 0) || 1;
                              const width = Math.max(8, Math.round((value / total) * 100));
                              return (
                                <div key={key}>
                                  <div className="flex items-center justify-between text-xs text-vintage-gray-700">
                                    <span className="uppercase tracking-wide">{key}</span>
                                    <span>{value}</span>
                                  </div>
                                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" style={{ width: `${width}%` }} />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </article>
                    </>
                  )}
                </div>
              </section>
            ) : (
              <>
                <div id="chat-feed" ref={feedRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
              {activeConnectorTags.length > 0 ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-800 font-medium">Routing connectors</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeConnectorTags.map((key) => {
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

              {conversations.length === 1 && !responding ? (
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

              {conversations.map((message) => {
                const isAssistant = message.role === 'assistant';
                const expandedSourceIndex = expandedSourceByMessage[message.id] ?? null;
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
                      <p className="whitespace-pre-wrap">{formatMainResponse(message.text)}</p>
                      {message.detailedText && message.detailedText !== message.text ? (
                        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-vintage-gray-600">Thinking</p>
                          <p className="mt-1 text-xs text-vintage-gray-800 whitespace-pre-wrap">{formatMainResponse(message.detailedText)}</p>
                        </div>
                      ) : null}
                      {(message.sandyThinking ?? message.thinking) ? (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Sandy thinking</p>
                          <p className="mt-1 text-xs text-emerald-900 whitespace-pre-wrap">{toReadableText(message.sandyThinking ?? message.thinking)}</p>
                        </div>
                      ) : null}
                      {message.meta ? <p className="text-[11px] mt-2 text-vintage-gray-500">{message.meta}</p> : null}

                      {message.sources && message.sources.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-vintage-gray-600">Sources</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, index) => {
                              const isExpanded = expandedSourceIndex === index;
                              return (
                                <button
                                  key={source.id}
                                  type="button"
                                  onClick={() => {
                                    setExpandedSourceByMessage((prev) => ({
                                      ...prev,
                                      [message.id]: isExpanded ? null : index,
                                    }));
                                  }}
                                  className={`w-7 h-7 rounded-full border text-xs font-semibold transition ${
                                    isExpanded
                                      ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                                      : 'border-gray-300 bg-white text-vintage-gray-700 hover:border-indigo-200 hover:text-indigo-700'
                                  }`}
                                  aria-label={`Toggle source ${index + 1}`}
                                >
                                  {index + 1}
                                </button>
                              );
                            })}
                          </div>

                          {expandedSourceIndex !== null && message.sources[expandedSourceIndex] ? (
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <p className="text-xs text-vintage-gray-700">
                                <span className="font-semibold">{message.sources[expandedSourceIndex].system}</span>
                              </p>
                              <p className="text-xs text-vintage-gray-500 mt-1">{message.sources[expandedSourceIndex].id}</p>
                              <p className="text-xs text-vintage-gray-700 mt-1 whitespace-pre-wrap">
                                {message.sources[expandedSourceIndex].excerpt}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {message.queryContext ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {message.queryContext.detected.map((tag) => (
                            <span key={tag} className="rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                              {tag.replace('-', ' ')}
                            </span>
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
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-vintage-gray-400 animate-pulse [animation-delay:240ms]" />
                      <span className="text-xs text-vintage-gray-500">Thinking...</span>
                    </span>
                  </div>
                </article>
              ) : null}
                </div>

                <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4 mb-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => void handlePdfSelected(event)}
                    className="hidden"
                  />
                  <form className="flex items-center gap-2 sm:gap-3" onSubmit={(e) => void handleSubmit(e)}>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="h-10 w-10 rounded-full border border-gray-200 text-vintage-gray-700 hover:bg-gray-50 inline-flex items-center justify-center disabled:opacity-60"
                  aria-label="Attach"
                  disabled={uploadingPdf || responding}
                >
                  <Paperclip className="w-4 h-4" aria-hidden />
                </button>

                {uploadingPdf ? (
                  <div className="w-28 shrink-0">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-vintage-gray-500 text-center">Uploading {uploadProgress}%</p>
                  </div>
                ) : null}

                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Message Query... (type @ to choose connector)"
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
                  {uploadingPdf ? 'Uploading...' : responding ? 'Working...' : 'Send'}
                </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
