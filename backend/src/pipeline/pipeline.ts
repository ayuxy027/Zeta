import { extractEntities } from "../services/extractor.service.js";
import { upsertChunk } from "../services/chromadb.service.js";
import { writeToGraph } from "../services/neo4j.service.js";
import type { PipelinePayload, ExtractedEntities } from "./types.js";

export interface PipelineResult {
  source_id: string;
  skipped: boolean;
  entities?: ExtractedEntities;
  error?: string;
}

export async function runPipeline(
  payload: PipelinePayload,
): Promise<PipelineResult> {
  const { source_id } = payload;

  // 1. Extract entities via LLM
  let entities: ExtractedEntities;
  try {
    entities = await extractEntities(payload.raw_text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[pipeline] Extraction failed for ${source_id}:`, message);
    return { source_id, skipped: true, error: message };
  }

  // 2. Skip if not relevant
  if (!entities.is_relevant) {
    console.log(`[pipeline] Skipping ${source_id} — not relevant`);
    return { source_id, skipped: true, entities };
  }

  console.log(
    `[pipeline] Processing ${source_id}: ${entities.decisions.length} decisions, ${entities.people.length} people`,
  );

  const errors: string[] = [];

  // 3. Write to ChromaDB (vector embeddings)
  try {
    await upsertChunk(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ChromaDB error";
    console.error(`[pipeline] ChromaDB write failed for ${source_id}:`, message);
    errors.push(`ChromaDB: ${message}`);
  }

  // 4. Write to Neo4j (knowledge graph)
  try {
    await writeToGraph(payload, entities);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neo4j error";
    console.error(`[pipeline] Neo4j write failed for ${source_id}:`, message);
    errors.push(`Neo4j: ${message}`);
  }

  return {
    source_id,
    skipped: false,
    entities,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
