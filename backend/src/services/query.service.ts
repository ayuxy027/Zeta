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
  sources: QuerySource[];
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
  // 1. Semantic search in ChromaDB
  const chunks = await queryChunks(question, 5);

  if (chunks.length === 0) {
    return {
      answer:
        "I don't have enough information in the knowledge base to answer this question.",
      sources: [],
    };
  }

  // 2. Get graph context from Neo4j
  const sourceIds = chunks.map((c) => c.source_id);
  const graphContext = await getGraphContext(sourceIds);

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
  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an organizational memory assistant. Answer the user's question based ONLY on the context below. Cite your sources by referencing the source number [Source N]. If the context doesn't contain enough information, say so.

${fullContext}

Question: ${question}`,
      },
    ],
  });

  const answer = response.choices[0]?.message?.content ?? "";

  // 5. Build source list
  const sources: QuerySource[] = chunks.map((c) => ({
    source_id: c.source_id,
    source_type: (c.metadata.source_type as string) ?? "unknown",
    preview: c.text.slice(0, 200),
    author: (c.metadata.author as string) ?? undefined,
    timestamp: (c.metadata.timestamp as string) ?? undefined,
    score: c.score,
  }));

  return { answer, sources };
}
