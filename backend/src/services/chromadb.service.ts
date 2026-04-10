import { ChromaClient } from "chromadb";
import type { PipelinePayload } from "../pipeline/types.js";

const COLLECTION_NAME = "zeta_knowledge";
const EMBED_MODEL = "gemini-embedding-001";

let client: ChromaClient | null = null;

function getClient(): ChromaClient {
  if (!client) {
    const url = process.env.CHROMADB_URL ?? "http://localhost:8000";
    client = new ChromaClient({ path: url });
  }
  return client;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is required for embeddings");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${apiKey}`;
  const body = {
    requests: texts.map((text) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google embedding API error: ${err}`);
  }

  const data = (await res.json()) as { embeddings: { values: number[] }[] };
  return data.embeddings.map((e) => e.values);
}

// Custom embedding function compatible with ChromaDB's IEmbeddingFunction interface
const googleEmbeddingFn = {
  generate: embedTexts,
};

async function getCollection() {
  return getClient().getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: googleEmbeddingFn,
  });
}

export async function upsertChunk(payload: PipelinePayload): Promise<void> {
  const collection = await getCollection();

  await collection.upsert({
    ids: [payload.source_id],
    documents: [payload.raw_text],
    metadatas: [
      {
        source_id: payload.source_id,
        source_type: payload.source_type,
        timestamp: payload.metadata.timestamp,
        author: payload.metadata.author ?? "",
        subject: payload.metadata.subject ?? "",
        channel: payload.metadata.channel ?? "",
        url: payload.metadata.url ?? "",
      },
    ],
  });
}

export interface ChunkResult {
  source_id: string;
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export async function queryChunks(
  query: string,
  nResults: number = 5,
): Promise<ChunkResult[]> {
  const collection = await getCollection();

  const results = await collection.query({
    queryTexts: [query],
    nResults,
  });

  const ids = results.ids[0] ?? [];
  const documents = results.documents[0] ?? [];
  const metadatas = results.metadatas[0] ?? [];
  const distances = results.distances?.[0] ?? [];

  return ids.map((id, i) => ({
    source_id: id,
    text: documents[i] ?? "",
    score: 1 - (distances[i] ?? 0),
    metadata: (metadatas[i] as Record<string, unknown>) ?? {},
  }));
}
