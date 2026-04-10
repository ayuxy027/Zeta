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
    ? `Question received: "${normalizedQuestion}".`
    : "Question received but text was empty.";

  const sourceLine = topSources.length
    ? `I found ${topSources.length} related source snippet${topSources.length === 1 ? "" : "s"}, but confidence is not high enough for a definitive answer.`
    : "No high-confidence source snippets were available in the indexed memory.";

  const scenarioLine: Record<FallbackScenario, string> = {
    missing_question:
      "I need a clearer question to return a source-grounded answer.",
    no_context:
      "I could not find enough relevant context across connected sources.",
    retrieval_failure:
      "A temporary retrieval issue blocked the evidence fetch step.",
    generation_failure:
      "A temporary synthesis issue blocked final answer generation.",
    empty_generation:
      "The synthesis response returned empty content, so I switched to safe fallback output.",
  };

  const concise =
    scenario === "missing_question"
      ? "I can help, but I need a specific question. Try asking about a decision, owner, timeline, or rationale."
      : "Here is a safe interim response while I stabilize retrieval and synthesis for this query.";

  const detailed = [
    concise,
    questionLine,
    sourceLine,
    scenarioLine[scenario],
    "Try narrowing scope with connector aliases like @slack, @gmail, @drive, or @meeting for higher precision.",
  ].join(" ");

  return {
    answer: concise,
    detailedAnswer: detailed,
    sources: topSources,
    thinking: "Fallback mode engaged to keep response continuity during MVP reliability checks.",
    responseMode: "fallback",
    fallback: {
      scenario,
      isMock: true,
      note: contextReason ?? scenarioLine[scenario],
    },
    david: {
      thinking: "I switched to deterministic fallback because evidence quality or model execution was insufficient.",
      decisions: [
        scenarioLine[scenario],
        "Return a realistic generic response instead of failing hard",
        "Preserve top source snippets when available",
      ],
    },
    sandy: {
      thinking: "Rendering stable, stakeholder-safe output for MVP demo continuity.",
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
    chunks = await withTimeout(queryChunks(question, 5), 7000, "retrieval");
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
    response = await withTimeout(
      getGroq().chat.completions.create({
        model: process.env.GROQ_QUERY_MODEL?.trim() || "qwen/qwen3-32b",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are an organizational memory assistant. Answer the user's question based ONLY on the context below. Cite your sources by referencing the source number [Source N]. If the context doesn't contain enough information, say so.

${fullContext}

Question: ${question}`,
          },
        ],
      }),
      12000,
      "generation",
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
  const davidThinking = thinking || extractedThinking;
  const davidDecisions = extractDavidDecisions(graphContext, chunks);
  const sandyDetailed = cleanedAnswer || answer;
  const sandyConcise = toConciseAnswer(sandyDetailed) || sandyDetailed;
  const sandyThinking =
    "Converted David's evidence graph into an executive-ready answer with source citations.";

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
