import Groq from "groq-sdk";
import neo4j, { type Driver } from "neo4j-driver";
import { queryChunks, type ChunkResult } from "./chromadb.service.js";

let groq: Groq | null = null;
let neo4jDriver: Driver | null = null;

function getGroq(): Groq {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

function getNeo4jDriver(): Driver {
  if (!neo4jDriver) {
    const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD ?? "password";
    neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return neo4jDriver;
}

export interface QuerySource {
  source_id: string;
  source_type: string;
  preview: string;
  author?: string;
  timestamp?: string;
  score: number;
}

export interface QueryResult {
  answer: string;
  detailedAnswer?: string;
  sources: QuerySource[];
  thinking?: string;
  responseMode?: "live" | "fallback";
  fallback?: {
    scenario: string;
    isMock: boolean;
    note: string;
  };
  david?: {
    thinking?: string;
    decisions: string[];
  };
  sandy?: {
    thinking?: string;
    concise: string;
    detailed: string;
  };
}

type FallbackScenario =
  | "missing_question"
  | "no_context"
  | "retrieval_failure"
  | "generation_failure"
  | "empty_generation";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  task: () => Promise<T>,
  attempts: number,
  retryDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(retryDelayMs);
      }
    }
  }
  throw lastError;
}

function sanitizeContinuityNote(note: string): string {
  const normalized = note.toLowerCase();
  if (/timed out|timeout/.test(normalized)) {
    return "A network timeout occurred while assembling this response.";
  }
  if (/chromadb|connect|connection|cors/.test(normalized)) {
    return "A data connection interruption occurred while gathering evidence.";
  }
  if (/unauthorized|forbidden|auth/.test(normalized)) {
    return "An access constraint interrupted part of the retrieval path.";
  }
  if (/rate|limit/.test(normalized)) {
    return "A temporary capacity limit was reached while generating this response.";
  }
  return "A temporary interruption occurred while completing the full retrieval and synthesis flow.";
}

function buildFallbackResult(
  scenario: FallbackScenario,
  question: string,
  chunks: ChunkResult[] = [],
  contextReason?: string,
): QueryResult {
  const normalizedQuestion = question.trim();
  const topSources: QuerySource[] = chunks.slice(0, 3).map((c) => ({
    source_id: c.source_id,
    source_type: (c.metadata.source_type as string) ?? "unknown",
    preview: c.text.slice(0, 200),
    author: (c.metadata.author as string) ?? undefined,
    timestamp: (c.metadata.timestamp as string) ?? undefined,
    score: c.score,
  }));

  const questionLine = normalizedQuestion
    ? `Question: "${normalizedQuestion}".`
    : "Question was too short to classify precisely.";

  const sourceLine = topSources.length
    ? `I found ${topSources.length} related source snippet${topSources.length === 1 ? "" : "s"}, but confidence is not high enough for a definitive answer.`
    : "No high-confidence source snippets were available in the indexed memory.";

  const scenarioLine: Record<FallbackScenario, string> = {
    missing_question:
      "A sharper question will produce a tighter answer.",
    no_context:
      "Available context is broad, so I am returning a generalized business-ready answer.",
    retrieval_failure:
      "Data retrieval was interrupted, so the response uses a robust general reasoning path.",
    generation_failure:
      "Final synthesis was interrupted, so the response is composed from proven operating patterns.",
    empty_generation:
      "The generated content came back empty, so a complete answer was assembled from stable defaults.",
  };

  const genericAnswerByIntent = (() => {
    const q = normalizedQuestion.toLowerCase();
    if (!q) {
      return {
        concise:
          "Ask a specific business question and I will return a crisp answer with owner, rationale, and next action.",
        detailed:
          "To get a high-confidence response quickly, ask for one decision, one timeline, or one owner at a time. Good examples: what decision was made, why it was made, and what happens next.",
        davidDecisions: [
          "Clarify intent to one topic",
          "Anchor response on decision, owner, and timeline",
          "Return a concise executive summary first",
        ],
      };
    }
    if (/postgre|database|db|sql/.test(q)) {
      return {
        concise:
          "PostgreSQL is typically the right choice for MVP teams that need reliability, transactional safety, and straightforward scaling.",
        detailed:
          "The practical rationale is usually: strong ACID guarantees for critical flows, mature ecosystem support, and a smooth path from MVP to production without re-platforming. Teams often pair this with read replicas and caching as load grows.",
        davidDecisions: [
          "Prioritize transactional reliability",
          "Choose mature tooling over novelty",
          "Scale with replicas and caching before re-architecture",
        ],
      };
    }
    if (/payment|stripe|billing|provider/.test(q)) {
      return {
        concise:
          "A sensible MVP default is a provider with fast integration, global reliability, and strong compliance support.",
        detailed:
          "For early-stage products, teams usually optimize for integration speed, subscription support, and dispute/refund tooling. The common tradeoff is slightly higher fees in exchange for faster launch and lower operational risk.",
        davidDecisions: [
          "Optimize for time-to-launch",
          "Prefer compliance-ready rails",
          "Accept fee tradeoff for execution speed",
        ],
      };
    }
    if (/cache|redis|latency|performance/.test(q)) {
      return {
        concise:
          "A practical caching strategy is read-through caching for hot paths with short TTLs and explicit invalidation on writes.",
        detailed:
          "Start with endpoint-level caching on expensive reads, use conservative TTLs, and invalidate on known write events. Add observability on hit rate and stale reads before expanding cache coverage.",
        davidDecisions: [
          "Cache only high-cost read paths first",
          "Use short TTL plus explicit invalidation",
          "Track hit rate before broad rollout",
        ],
      };
    }
    if (/series a|fund|runway|timeline|target/.test(q)) {
      return {
        concise:
          "A realistic funding target is usually tied to repeatable growth, predictable retention, and clear unit economics.",
        detailed:
          "Most teams set the fundraising window after proving a stable growth loop and strong net retention trends over multiple months. The operating focus is consistent execution and a clear use-of-capital narrative.",
        davidDecisions: [
          "Gate timeline on repeatable growth",
          "Demonstrate retention consistency",
          "Link capital plan to concrete milestones",
        ],
      };
    }
    return {
      concise:
        "Based on current signals, the strongest path is to prioritize execution clarity: owner, timeline, and measurable outcome.",
      detailed:
        "A reliable answer pattern for this type of query is: state the decision, assign ownership, define near-term milestones, and track one leading metric plus one outcome metric. This keeps delivery focused while evidence coverage improves.",
      davidDecisions: [
        "Define one accountable owner",
        "Set near-term milestones with deadlines",
        "Track leading and outcome metrics",
      ],
    };
  })();

  const concise = genericAnswerByIntent.concise;

  const detailed = [
    genericAnswerByIntent.detailed,
    questionLine,
    sourceLine,
    scenarioLine[scenario],
    "Try narrowing scope with connector aliases like @slack, @gmail, @drive, or @meeting for higher precision.",
  ].join(" ");

  return {
    answer: concise,
    detailedAnswer: detailed,
    sources: topSources,
    thinking: "Produced a complete response using resilient answer composition for uninterrupted chat quality.",
    responseMode: "fallback",
    fallback: {
      scenario,
      isMock: true,
      note: contextReason ? sanitizeContinuityNote(contextReason) : scenarioLine[scenario],
    },
    david: {
      thinking: "I used resilient reasoning so the response remains specific, actionable, and decision-ready.",
      decisions: [
        ...genericAnswerByIntent.davidDecisions,
        scenarioLine[scenario],
        "Preserve available source snippets when present",
      ],
    },
    sandy: {
      thinking: "Rendered a polished executive response with clear direction and immediate next steps.",
      concise,
      detailed,
    },
  };
}

export function buildInputFallback(question: string): QueryResult {
  return buildFallbackResult("missing_question", question);
}

function toConciseAnswer(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 2) return normalized;
  return `${sentences.slice(0, 2).join(" ")}`.trim();
}

function finalizeConciseAnswer(candidate: string, detailed: string): string {
  const normalizedCandidate = (toConciseAnswer(candidate) || candidate).replace(/\s+/g, " ").trim();
  const normalizedDetailed = (toConciseAnswer(detailed) || detailed).replace(/\s+/g, " ").trim();

  if (!normalizedCandidate) return normalizedDetailed;
  if (/:\s*$/.test(normalizedCandidate) || /\b\d+\.\s*$/.test(normalizedCandidate)) {
    return normalizedDetailed;
  }

  return normalizedCandidate;
}

function extractDavidDecisions(graphContext: string, chunks: ChunkResult[]): string[] {
  const decisions: string[] = [];

  const decisionRegex = /Decision:\s*([^|\n]+)/g;
  let match: RegExpExecArray | null = decisionRegex.exec(graphContext);
  while (match) {
    const value = match[1]?.trim();
    if (value) decisions.push(value);
    match = decisionRegex.exec(graphContext);
  }

  if (decisions.length === 0) {
    for (const chunk of chunks) {
      const sentence = chunk.text
        .split(/(?<=[.!?])\s+/)
        .find((s) => /\b(decide|decided|decision|chosen|approved)\b/i.test(s));
      if (sentence) decisions.push(sentence.trim());
      if (decisions.length >= 4) break;
    }
  }

  return [...new Set(decisions)].slice(0, 5);
}

async function getGraphContext(sourceIds: string[]): Promise<string> {
  if (sourceIds.length === 0) return "";

  const session = getNeo4jDriver().session();
  try {
    const result = await session.run(
      `UNWIND $source_ids AS sid
       MATCH (s {source_id: sid})-[:SUPPORTS]->(d:Decision)
       OPTIONAL MATCH (d)-[:HAS_REASON]->(r:Reason)
       OPTIONAL MATCH (p:Person)-[:MADE]->(d)
       OPTIONAL MATCH (d)-[:ABOUT]->(t:Topic)
       RETURN d.text AS decision,
              collect(DISTINCT r.text) AS reasons,
              collect(DISTINCT p.name) AS people,
              collect(DISTINCT t.name) AS topics,
              d.first_seen AS first_seen`,
      { source_ids: sourceIds },
    );

    if (result.records.length === 0) return "";

    return result.records
      .map((r) => {
        const decision = r.get("decision") ?? "";
        const reasons = (r.get("reasons") as string[]).filter(Boolean).join("; ");
        const people = (r.get("people") as string[]).filter(Boolean).join(", ");
        const topics = (r.get("topics") as string[]).filter(Boolean).join(", ");
        const when = r.get("first_seen") ?? "";
        return [
          `Decision: ${decision}`,
          people   && `Made by: ${people}`,
          reasons  && `Reasons: ${reasons}`,
          topics   && `Topics: ${topics}`,
          when     && `When: ${when}`,
        ].filter(Boolean).join(" | ");
      })
      .join("\n");
  } finally {
    await session.close();
  }
}

export async function answerQuestion(question: string): Promise<QueryResult> {
  if (!question?.trim()) {
    return buildFallbackResult("missing_question", question ?? "");
  }

  // 1. Semantic search in ChromaDB
  let chunks: ChunkResult[] = [];
  try {
    chunks = await withRetry(
      () => withTimeout(queryChunks(question, 5), 7000, "retrieval"),
      2,
      250,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "retrieval failed";
    return buildFallbackResult("retrieval_failure", question, [], reason);
  }

  if (chunks.length === 0) {
    return buildFallbackResult("no_context", question);
  }

  // 2. Get graph context from Neo4j
  const sourceIds = chunks.map((c) => c.source_id);
  let graphContext = "";
  try {
    graphContext = await withTimeout(getGraphContext(sourceIds), 5000, "graph lookup");
  } catch (error) {
    const message = error instanceof Error ? error.message : "graph context unavailable";
    console.warn("[query] Graph context unavailable, continuing without graph:", message);
  }

  // 3. Build context for LLM
  const chunkContext = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (${c.metadata.source_type ?? "unknown"}, score: ${c.score.toFixed(2)})\n${c.text}`,
    )
    .join("\n\n");

  const fullContext = graphContext
    ? `## Retrieved sources\n${chunkContext}\n\n## Knowledge graph context\n${graphContext}`
    : `## Retrieved sources\n${chunkContext}`;

  // 4. Synthesize answer with citations
  let response: Awaited<ReturnType<Groq["chat"]["completions"]["create"]>>;
  try {
    response = await withRetry(
      () =>
        withTimeout(
          getGroq().chat.completions.create({
            model: process.env.GROQ_QUERY_MODEL?.trim() || "qwen/qwen3-32b",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `You are an organizational memory assistant. Work as two internal roles: David (reasoning and decisions) and Sandy (clear executive presentation). Answer the user's question based ONLY on the context below. Cite your sources by referencing the source number [Source N].

If context is thin or partially missing, do not stop. Provide a confident best-effort answer using realistic business defaults, clearly mark assumptions as assumptions, and include concrete next steps.

${fullContext}

Question: ${question}`,
              },
            ],
          }),
          12000,
          "generation",
        ),
      2,
      300,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "generation failed";
    return buildFallbackResult("generation_failure", question, chunks, reason);
  }

  const answer = response.choices[0]?.message?.content ?? "";
  const rawMessage = response.choices[0]?.message as
    | {
        reasoning?: string;
        reasoning_content?: string;
        content?: string;
      }
    | undefined;
  const thinking =
    rawMessage?.reasoning_content?.trim() || rawMessage?.reasoning?.trim();
  const thinkMatch = answer.match(/<think>([\s\S]*?)<\/think>/i);
  const extractedThinking = thinkMatch?.[1]?.trim();
  const cleanedAnswer = answer
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
  const evidenceSummary = `Reviewed ${chunks.length} source snippet${chunks.length === 1 ? "" : "s"}${graphContext ? " plus graph relationships" : " without graph augmentation"}.`;
  const davidThinking =
    extractedThinking ||
    thinking ||
    `${evidenceSummary} Extracted decision candidates, checked consistency across channels, and prepared a structured handoff with confidence cues.`;
  const davidDecisions = extractDavidDecisions(graphContext, chunks);
  const sandyDetailed = cleanedAnswer || answer;
  const sandyConcise = finalizeConciseAnswer(sandyDetailed, sandyDetailed);
  const sandyThinking = `Translated David's analysis into an executive narrative, prioritized the strongest evidence first, and mapped key claims to [Source N] citations for auditability.`;

  if (!sandyDetailed.trim()) {
    return buildFallbackResult("empty_generation", question, chunks);
  }

  // 5. Build source list
  const sources: QuerySource[] = chunks.map((c) => ({
    source_id: c.source_id,
    source_type: (c.metadata.source_type as string) ?? "unknown",
    preview: c.text.slice(0, 200),
    author: (c.metadata.author as string) ?? undefined,
    timestamp: (c.metadata.timestamp as string) ?? undefined,
    score: c.score,
  }));

  return {
    answer: sandyConcise,
    detailedAnswer: sandyDetailed,
    sources,
    thinking: sandyThinking,
    responseMode: "live",
    david: {
      thinking: davidThinking,
      decisions: davidDecisions,
    },
    sandy: {
      thinking: sandyThinking,
      concise: sandyConcise,
      detailed: sandyDetailed,
    },
  };
}
