import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepState = 'pending' | 'syncing' | 'done';

export interface SyncStep {
  label: string;
  state: StepState;
  progress: number;
  duration: number;
}

interface SyncContextValue {
  googleSteps: SyncStep[];
  slackSteps:  SyncStep[];
  googleActive: boolean;
  slackActive:  boolean;
  isAnySyncing: boolean;
  startGoogle:    () => void;
  startSlack:     () => void;
  stopGoogle:     () => void;
  stopSlack:      () => void;
  activateGoogle: () => void;
  activateSlack:  () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const PIPELINE_LS_KEY = 'zeta_sync_pipeline';

type CacheEntry = { steps: SyncStep[]; done: boolean };

const pipelineCache = {
  _m: new Map<string, CacheEntry>(
    (() => {
      try {
        const r = localStorage.getItem(PIPELINE_LS_KEY);
        return r ? (Object.entries(JSON.parse(r)) as [string, CacheEntry][]) : [];
      } catch { return []; }
    })(),
  ),
  get(k: string) { return this._m.get(k); },
  set(k: string, v: CacheEntry) { this._m.set(k, v); this._flush(); },
  delete(k: string) { this._m.delete(k); this._flush(); },
  _flush() {
    try { localStorage.setItem(PIPELINE_LS_KEY, JSON.stringify(Object.fromEntries(this._m))); }
    catch { /* quota */ }
  },
};

interface Phase {
  idx: number; effectiveStart: number;
  pausing: boolean; pauseDur: number;
  stalling: boolean; stallStart: number; stallDur: number; stallAt: number;
  hasStall: boolean; done: boolean;
}

function makePhase(idx: number): Phase {
  return {
    idx, effectiveStart: Date.now(),
    pausing: false, pauseDur: rand(900, 1800),
    stalling: false, stallStart: 0, stallDur: rand(2500, 5000),
    stallAt: rand(0.28, 0.72), hasStall: Math.random() < 0.65, done: false,
  };
}

function blankSteps(labels: string[]): SyncStep[] {
  return labels.map(l => ({ label: l, state: 'pending' as StepState, progress: 0, duration: rand(5000, 11000) }));
}

// ─── Hook: one pipeline per connector ────────────────────────────────────────

function usePipeline(labels: string[], active: boolean, cacheKey: string) {
  const [steps, setSteps] = useState<SyncStep[]>(() => {
    const cached = pipelineCache.get(cacheKey);
    return cached ? cached.steps.map(s => ({ ...s })) : blankSteps(labels);
  });

  const phaseRef = useRef<Phase>(makePhase(0));
  const rafRef   = useRef<number | null>(null);

  useEffect(() => {
    if (!cacheKey || !active) return;
    pipelineCache.set(cacheKey, { steps, done: steps.every(s => s.state === 'done') });
  }, [steps, cacheKey, active]);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setSteps(blankSteps(labels));
      return;
    }

    const cached = pipelineCache.get(cacheKey);

    if (cached?.done) {
      setSteps(cached.steps.map(s => ({ ...s })));
      return;
    }

    const resumeIdx = cached
      ? Math.max(0, cached.steps.findIndex(s => s.state !== 'done'))
      : 0;

    phaseRef.current = makePhase(resumeIdx);

    setSteps(labels.map((l, i) => {
      if (cached && i < resumeIdx)
        return cached.steps[i] ?? { label: l, state: 'done' as StepState, progress: 1, duration: 0 };
      return {
        label: l,
        state: i === resumeIdx ? 'syncing' as StepState : 'pending' as StepState,
        progress: 0,
        duration: rand(5000, 11000),
      };
    }));

    const tick = () => {
      const p = phaseRef.current;
      if (p.done || p.idx >= labels.length) return;
      const now = Date.now();

      setSteps(prev => {
        const next = prev.map(s => ({ ...s }));

        if (p.pausing) {
          if (now - p.effectiveStart >= p.pauseDur) {
            const nxt = p.idx + 1;
            if (nxt >= labels.length) { phaseRef.current = { ...p, done: true }; return next; }
            phaseRef.current = makePhase(nxt);
            next[nxt] = { ...next[nxt]!, state: 'syncing', progress: 0, duration: rand(5000, 11000) };
          }
          return next;
        }

        if (p.stalling) {
          const stallElapsed = now - p.stallStart;
          if (stallElapsed >= p.stallDur)
            phaseRef.current = { ...p, stalling: false, effectiveStart: p.effectiveStart + stallElapsed };
          return next;
        }

        const dur = next[p.idx]?.duration ?? 7000;
        const progress = Math.min((now - p.effectiveStart) / dur, 1);
        const cur = next[p.idx];
        if (!cur) return next;

        if (p.hasStall && progress >= p.stallAt) {
          phaseRef.current = { ...p, stalling: true, stallStart: now, hasStall: false };
          next[p.idx] = { ...cur, state: 'syncing', progress: p.stallAt };
          return next;
        }

        next[p.idx] = { ...cur, state: 'syncing', progress };
        if (progress >= 1) {
          next[p.idx] = { ...cur, state: 'done', progress: 1 };
          phaseRef.current = { ...p, pausing: true, effectiveStart: now };
        }

        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    // No cleanup cancel — intentional: pipeline keeps running when component navigates away
    return () => { /* intentionally no RAF cancel */ };
  }, [active, cacheKey]);

  return steps;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleActive, setGoogleActive] = useState(() => {
    const cached = pipelineCache.get('google');
    return !!(cached && !cached.done);
  });
  const [slackActive, setSlackActive] = useState(() => {
    const cached = pipelineCache.get('slack');
    return !!(cached && !cached.done);
  });

  const googleSteps = usePipeline(['Gmail', 'Drive', 'Calendar'], googleActive, 'google');
  const slackSteps  = usePipeline(['Channels', 'Alerts'],          slackActive,  'slack');

  const allGoogleDone = googleSteps.every(s => s.state === 'done');
  const allSlackDone  = slackSteps.every(s => s.state === 'done');

  // Auto-deactivate once fully done (keeps done state visible but stops loop)
  useEffect(() => {
    if (googleActive && allGoogleDone) setGoogleActive(false);
  }, [googleActive, allGoogleDone]);
  useEffect(() => {
    if (slackActive && allSlackDone) setSlackActive(false);
  }, [slackActive, allSlackDone]);

  const startGoogle = useCallback(() => {
    pipelineCache.delete('google');
    setGoogleActive(true);
  }, []);
  const startSlack = useCallback(() => {
    pipelineCache.delete('slack');
    setSlackActive(true);
  }, []);
  const stopGoogle = useCallback(() => {
    pipelineCache.delete('google');
    setGoogleActive(false);
  }, []);
  const stopSlack = useCallback(() => {
    pipelineCache.delete('slack');
    setSlackActive(false);
  }, []);
  // Activate without clearing cache — resumes in-progress or starts fresh if no cache
  const activateGoogle = useCallback(() => { setGoogleActive(true); }, []);
  const activateSlack  = useCallback(() => { setSlackActive(true);  }, []);

  const isAnySyncing =
    (googleActive && !allGoogleDone) ||
    (slackActive  && !allSlackDone);

  return (
    <SyncContext.Provider value={{
      googleSteps, slackSteps,
      googleActive, slackActive,
      isAnySyncing,
      startGoogle, startSlack,
      stopGoogle, stopSlack,
      activateGoogle, activateSlack,
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export function useSyncContext() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSyncContext must be used inside SyncProvider');
  return ctx;
}

export { pipelineCache };
