# Pipeline Architecture — Neo4j + ChromaDB Integration

## Current Status

| Layer | Slack | Gmail | Drive | Neo4j | ChromaDB | LLM |
|-------|-------|-------|-------|-------|----------|-----|
| OAuth / Connection | ✅ | ✅ | ✅ | — | — | — |
| Data retrieval | ✅ webhook | ✅ pull | ✅ pull | — | — | — |
| Text extraction | ❌ stub | ✅ gmailParse | ✅ extractText | — | — | — |
| LLM extraction | ❌ TODO | ❌ TODO | ❌ TODO | — | — | — |
| Neo4j write | ❌ TODO | ❌ TODO | ❌ TODO | ❌ not wired | — | — |
| ChromaDB write | ❌ TODO | ❌ TODO | ❌ TODO | — | ❌ not wired | — |

**What's done**: All three sources can authenticate, retrieve, and extract raw text.  
**What's missing**: The universal processing pipeline that takes that raw text → LLM → Neo4j + ChromaDB.

---

## System Design (from PRD)

```
[Slack webhook]  [Gmail pull]  [Drive ingest]  [Meeting (future)]
       │               │               │
       └───────────────┴───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │     PROCESSING PIPELINE     │
         │                             │
         │  1. Ingestion worker        │  ← pulls/receives raw content
         │  2. LLM extraction          │  ← entities, decisions, people
         │  3. Embedder                │  ← vectorise chunks
         │  4. Graph writer            │  ← writes to Neo4j
         │                             │
         │  LangChain orchestration    │
         └──────────┬──────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
      ChromaDB              Neo4j
  (vector embeddings)   (nodes + relationships)
          │                    │
          └─────────┬──────────┘
                    ▼
         AI Query Interface
     (semantic search + graph
      traversal + cited answer)
```

---

## Architecture Decision: Universal Pipeline

**One pipeline, not one per source.** Every source (Slack, Gmail, Drive, Meeting) produces a
`PipelinePayload` — a normalised envelope with raw text + metadata. The pipeline doesn't care
where it came from.

```typescript
interface PipelinePayload {
  source_id:   string          // e.g. "slack_C04AB_1704856800"
  source_type: "slack" | "gmail" | "drive" | "meeting"
  raw_text:    string          // full thread / email body / doc text
  metadata: {
    author?:   string
    timestamp: string          // ISO 8601
    subject?:  string          // email subject or doc title
    channel?:  string          // Slack channel
    url?:      string          // Drive URL
  }
}
```

Each source adapter just fills this envelope and hands it to the pipeline.

---

## Implementation Plan

### Step 1 — Neo4j service (`services/neo4j.service.ts`)
- Connect using `neo4j-driver`
- `writeSlackEvent(payload, extracted)` — create nodes + relationships
- `writeEmailEvent(payload, extracted)` — same shape
- `writeDocumentEvent(payload, extracted)` — same shape
- Schema: Decision, Person, Reason, SlackMessage, Email, Document nodes

### Step 2 — ChromaDB service (`services/chromadb.service.ts`)
- Connect to ChromaDB instance
- `upsertChunk(payload)` — embed raw_text, store with source_id metadata
- Uses `source_id` as the ChromaDB document ID (idempotent)

### Step 3 — LLM extraction service (`services/extractor.service.ts`)
- Add `@anthropic-ai/sdk` to package.json
- Prompt Haiku to extract: `{ decisions[], people[], reasons[], topics[], is_relevant }`
- Input: `raw_text` from PipelinePayload
- Output: `ExtractedEntities` (type already defined in slack.types.ts)

### Step 4 — Universal pipeline (`pipeline/pipeline.ts`)
- `runPipeline(payload: PipelinePayload)` orchestrates:
  1. `extractEntities(payload.raw_text)` → entities
  2. If `!is_relevant` → skip
  3. `upsertChunk(payload)` → ChromaDB
  4. `writeToGraph(payload, entities)` → Neo4j (source-specific writer)
- Single function called by ALL source workers

### Step 5 — Wire sources into pipeline
- **Slack worker**: replace TODOs with `runPipeline(payload)`
- **Gmail**: after fetching message → `runPipeline(payload)`
- **Drive**: after extractText → `runPipeline(payload)` per document

### Step 6 — Query endpoint (`routes/query.ts`)
- `POST /api/query { question: string }`
- ChromaDB semantic search → top-k chunks with source_ids
- Neo4j traversal from source_ids → graph context
- LLM (Sonnet) synthesis → cited answer

---

## File Structure (to build)

```
backend/src/
├── pipeline/
│   └── pipeline.ts              ← universal runPipeline()
├── services/
│   ├── neo4j.service.ts         ← graph writer
│   ├── chromadb.service.ts      ← vector store writer
│   └── extractor.service.ts     ← LLM entity extraction
└── routes/
    └── query.ts                 ← POST /api/query
```

---

## Build Order

| # | File | Depends on |
|---|------|-----------|
| 1 | `extractor.service.ts` | Anthropic SDK |
| 2 | `neo4j.service.ts` | Neo4j running |
| 3 | `chromadb.service.ts` | ChromaDB running |
| 4 | `pipeline/pipeline.ts` | 1 + 2 + 3 |
| 5 | Wire Slack worker | 4 |
| 6 | Wire Gmail route | 4 |
| 7 | Wire Drive route | 4 |
| 8 | `routes/query.ts` | 2 + 3 + Anthropic |

---

## New env vars needed

```env
# Anthropic (LLM extraction + answer synthesis)
ANTHROPIC_API_KEY=sk-ant-...

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# ChromaDB
CHROMADB_URL=http://localhost:8000
```
