import React from 'react';
import { Bot, Compass, Paperclip, SendHorizontal, Sparkles, User } from 'lucide-react';

type TabType = 'query' | 'visualise';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  meta?: string;
};

const QUERY_MESSAGES: Message[] = [
  {
    id: 'q-assistant-1',
    role: 'assistant',
    text: 'Hey! Ask me anything from your workspace data and I will draft a clear answer with cited context.',
    meta: 'Zeta Assistant · now',
  },
  {
    id: 'q-user-1',
    role: 'user',
    text: 'What changed in customer churn this month compared to the previous one?',
    meta: 'You · just now',
  },
  {
    id: 'q-assistant-2',
    role: 'assistant',
    text: 'Churn is down 12.4% MoM. Biggest improvement came from onboarding fixes and lower trial drop-offs in week 1.',
    meta: 'Zeta Assistant · just now',
  },
];

const VISUALISE_MESSAGES: Message[] = [
  {
    id: 'v-assistant-1',
    role: 'assistant',
    text: 'Visual mode is warming up. You can already chat here while we prepare richer interactive outputs.',
    meta: 'Zeta Visualise · now',
  },
  {
    id: 'v-user-1',
    role: 'user',
    text: 'Show me growth by channel and highlight outliers from the last quarter.',
    meta: 'You · just now',
  },
  {
    id: 'v-assistant-2',
    role: 'assistant',
    text: 'Something is cooking: chart-ready responses, guided breakdowns, and reusable views are coming next.',
    meta: 'Zeta Visualise · just now',
  },
];

const STARTER_PROMPTS: Record<TabType, string[]> = {
  query: [
    'Summarize top customer pain points from this week.',
    'List launch blockers with owners and deadlines.',
    'What changed in retention after onboarding updates?',
  ],
  visualise: [
    'Compare monthly growth by acquisition channel.',
    'Highlight anomalies in weekly active users.',
    'Map conversion drop by signup step.',
  ],
};

const ASSISTANT_REPLY: Record<TabType, string> = {
  query:
    'Got it. This is UI-only for now, but the interaction flow is ready for real responses and citations.',
  visualise:
    'Locked in. Visual mode is prepared for chart-oriented responses once the backend hook is connected.',
};

const ChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabType>('query');
  const [conversations, setConversations] = React.useState<Record<TabType, Message[]>>({
    query: QUERY_MESSAGES,
    visualise: VISUALISE_MESSAGES,
  });
  const [drafts, setDrafts] = React.useState<Record<TabType, string>>({
    query: '',
    visualise: '',
  });
  const [isResponding, setIsResponding] = React.useState<Record<TabType, boolean>>({
    query: false,
    visualise: false,
  });
  const messageCounterRef = React.useRef(0);
  const pendingTimeoutsRef = React.useRef<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const feedRef = React.useRef<HTMLDivElement | null>(null);

  const isQuery = activeTab === 'query';
  const title = isQuery ? 'Query' : 'Visualise';
  const subtitle = isQuery
    ? 'Conversational answers powered by your connected sources.'
    : 'Same chat interface for now, with richer visual workflows coming in fast.';
  const messages = conversations[activeTab];
  const draft = drafts[activeTab];
  const tabResponding = isResponding[activeTab];

  React.useEffect(() => {
    inputRef.current?.focus();
  }, [activeTab]);

  React.useEffect(() => {
    const feed = feedRef.current;
    if (!feed) {
      return;
    }
    feed.scrollTop = feed.scrollHeight;
  }, [messages, tabResponding]);

  React.useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      pendingTimeoutsRef.current = [];
    };
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
  };

  const setDraft = (tab: TabType, nextValue: string) => {
    setDrafts((prev) => ({ ...prev, [tab]: nextValue }));
  };

  const pushMessage = (tab: TabType, role: Message['role'], text: string, meta: string) => {
    messageCounterRef.current += 1;
    const nextMessage: Message = {
      id: `${tab}-${role}-${messageCounterRef.current}`,
      role,
      text,
      meta,
    };

    setConversations((prev) => ({
      ...prev,
      [tab]: [...prev[tab], nextMessage],
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (tabResponding) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    pushMessage(activeTab, 'user', trimmed, 'You - now');
    setDraft(activeTab, '');
    setIsResponding((prev) => ({ ...prev, [activeTab]: true }));

    const currentTab = activeTab;
    const timeoutId = window.setTimeout(() => {
      pushMessage(currentTab, 'assistant', ASSISTANT_REPLY[currentTab], `${currentTab === 'query' ? 'Zeta Assistant' : 'Zeta Visualise'} - now`);
      setIsResponding((prev) => ({ ...prev, [currentTab]: false }));
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter((id) => id !== timeoutId);
    }, 520);

    pendingTimeoutsRef.current.push(timeoutId);
  };

  const clearChat = (tab: TabType) => {
    setConversations((prev) => ({
      ...prev,
      [tab]: tab === 'query' ? QUERY_MESSAGES : VISUALISE_MESSAGES,
    }));
    setDraft(tab, '');
    setIsResponding((prev) => ({ ...prev, [tab]: false }));
  };

  return (
    <div className="min-h-screen bg-vintage-white pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <section className="rounded-3xl border border-gray-200/90 bg-gradient-to-br from-white via-white to-indigo-50/45 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.6)] overflow-hidden">
          <div className="border-b border-gray-200/90 px-4 sm:px-6 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-vintage-black flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" aria-hidden />
                  Chat
                </h1>
                <p className="text-sm sm:text-base text-vintage-gray-600 mt-2 max-w-2xl">{subtitle}</p>
              </div>
              {!isQuery ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-medium h-fit">
                  <Compass className="w-3.5 h-3.5" aria-hidden />
                  Something cooking
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 pb-4">
              <div className="flex items-center gap-2" role="tablist" aria-label="Chat mode tabs">
              <button
                type="button"
                  role="tab"
                  aria-selected={isQuery}
                  aria-controls="chat-feed"
                onClick={() => switchTab('query')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isQuery
                    ? 'bg-vintage-black text-white shadow-sm'
                    : 'bg-white text-vintage-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                Query
              </button>
              <button
                type="button"
                  role="tab"
                  aria-selected={!isQuery}
                  aria-controls="chat-feed"
                onClick={() => switchTab('visualise')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  !isQuery
                    ? 'bg-vintage-black text-white shadow-sm'
                    : 'bg-white text-vintage-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                Visualise
              </button>
              </div>

              <button
                type="button"
                onClick={() => clearChat(activeTab)}
                className="text-xs sm:text-sm text-vintage-gray-600 hover:text-vintage-black transition"
              >
                Reset chat
              </button>
            </div>

            <div className="-mt-1 pb-4 flex flex-wrap gap-2">
              {STARTER_PROMPTS[activeTab].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setDraft(activeTab, prompt);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-vintage-gray-700 hover:border-indigo-200 hover:bg-indigo-50/40 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[62vh] min-h-[460px] max-h-[760px] flex flex-col">
            <div id="chat-feed" ref={feedRef} className="flex-1 overflow-auto px-4 sm:px-6 py-5 space-y-4">
              {messages.map((message) => {
                const isAssistant = message.role === 'assistant';
                return (
                  <article
                    key={message.id}
                    className={`flex items-start gap-3 ${isAssistant ? '' : 'justify-end'}`}
                  >
                    {isAssistant ? (
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" aria-hidden />
                      </span>
                    ) : null}

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-[15px] leading-relaxed shadow-sm ${
                        isAssistant
                          ? 'bg-white border border-gray-200 text-vintage-gray-800'
                          : 'bg-vintage-black text-white'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.meta ? (
                        <p
                          className={`text-[11px] mt-2 ${
                            isAssistant ? 'text-vintage-gray-500' : 'text-vintage-white/70'
                          }`}
                        >
                          {message.meta}
                        </p>
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

              {tabResponding ? (
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

            <div className="border-t border-gray-200 bg-white/80 backdrop-blur px-4 sm:px-6 py-4">
              <form className="flex items-center gap-2 sm:gap-3" onSubmit={handleSubmit}>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-gray-200 text-vintage-gray-700 hover:bg-gray-50 inline-flex items-center justify-center disabled:opacity-60"
                  aria-label="Attach"
                  disabled
                >
                  <Paperclip className="w-4 h-4" aria-hidden />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message ${title}...`}
                  value={draft}
                  onChange={(event) => setDraft(activeTab, event.target.value)}
                  className="flex-1 h-11 rounded-full border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="h-11 px-4 sm:px-5 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition inline-flex items-center gap-2 disabled:opacity-60 disabled:hover:bg-indigo-600"
                  disabled={!draft.trim() || tabResponding}
                >
                  <SendHorizontal className="w-4 h-4" aria-hidden />
                  {tabResponding ? 'Working...' : 'Send'}
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
