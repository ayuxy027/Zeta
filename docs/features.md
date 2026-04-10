# Features — Zeta (Organizational Memory & Reasoning Engine)

> This document is the source of truth for what Zeta does. Pass this as context to any developer working on the project.

---

## System Overview

Zeta is a multi-agent AI backend + chat UI that turns scattered company communications into a searchable, citable knowledge graph. It answers organizational questions by traversing evidence across Slack, Gmail, meetings, and documents.

---

## Feature Areas

### F1 — Slack Ingestion
**Status**: Not started
**Owner**: Backend

- Receive Slack Events API webhooks
- Queue events (Redis/BullMQ) for async processing
- Fetch full thread context via `conversations.replies`
- Classify message relevance (LLM: cheap model)
- Extract structured entities: decisions, people, reasons, topics (LLM: Haiku)
- Deduplicate via `event_id`
- Write to Neo4j (graph nodes) and ChromaDB (vector embedding)

---

### F2 — Gmail Ingestion
**Status**: Not started
**Owner**: Backend

- Connect via Gmail API + Pub/Sub push notifications
- Parse email threads (subject, sender, body, timestamp)
- Extract decisions and reasoning via LLM
- Dual write to Neo4j + ChromaDB with shared `source_id`

---

### F3 — Meeting Transcription Pipeline
**Status**: Not started
**Owner**: Backend

- Accept audio upload (MP3/MP4/WAV) via API
- Transcribe via OpenAI Whisper
- Chunk transcript by speaker/time
- Extract entities from transcript chunks
- Write to Neo4j + ChromaDB

---

### F4 — Document Ingestion
**Status**: Not started
**Owner**: Backend

- Accept PDF / plain text upload
- Chunk into segments
- Embed and write to ChromaDB
- Extract structural decisions to Neo4j if present

---

### F5 — Neo4j Knowledge Graph
**Status**: Not started
**Owner**: Backend

Graph schema:
- **Nodes**: `Decision`, `Person`, `Reason`, `Meeting`, `SlackMessage`, `Email`, `Document`
- **Relationships**: `MADE`, `ATTENDED`, `PRODUCED`, `HAS_REASON`, `SUPPORTS {weight}`, `FOLLOWED_UP_WITH`, `REFERENCES`

Key design: `source_id` on every node links back to the ChromaDB chunk for the raw text.

---

### F6 — ChromaDB Vector Store
**Status**: Not started
**Owner**: Backend

- Stores raw text chunks as embeddings
- Each chunk tagged with: `source_id`, `source_type`, `timestamp`, `channel/thread/email_id`
- Used for semantic search at query time
- Returns top-k chunks with similarity scores → scores stored back to Neo4j as `SUPPORTS.weight`

---

### F7 — Query Engine (LangChain Orchestration)
**Status**: Not started
**Owner**: Backend

Query flow when user asks a question:
1. ChromaDB semantic search → top-k chunks with `source_id`s
2. Neo4j graph traversal from those `source_id`s → connected decisions, people, reasons
3. Combined context (graph + chunks) passed to LLM (Sonnet)
4. LLM returns cited answer: answer text + list of source references

---

### F8 — REST API (Node.js + Express)
**Status**: Not started
**Owner**: Backend

Runtime: **Node.js** | Framework: **Express** | Language: **TypeScript**
Queue: **BullMQ** (Redis-backed) | Testing: **Jest + Supertest** (TDD)

Endpoints:
- `POST /slack/events` — Slack webhook receiver
- `POST /gmail/webhook` — Gmail Pub/Sub receiver
- `POST /ingest/meeting` — Upload audio for transcription
- `POST /ingest/document` — Upload document
- `POST /query` — Ask a question, get a cited answer
- `GET /health` — Health check

---

### F9 — Frontend Chat UI
**Status**: Mostly complete (landing page, routing done)
**Owner**: Frontend

Pages built:
- Landing page (Hero, Features, Integration, CTA sections)
- Dashboard page (shell)
- About, Blog, Pricing, Changelog pages

Remaining:
- Chat interface wired to `POST /query`
- Evidence trail display (source cards below each answer)
- Source type badges (Slack / Gmail / Meeting / Document)

---

## Shared Data Contract

Every piece of ingested content carries this envelope across both databases:

```
source_id:    unique ID (e.g., "slack_C04AB_1704856800.123456")
source_type:  "slack" | "gmail" | "meeting" | "document"
timestamp:    ISO 8601
raw_text:     the actual content
metadata:     { channel, sender, subject, meeting_title, etc. }
```

`source_id` is the join key between ChromaDB and Neo4j. Never ingest without it.

---

## LLM Model Assignments

| Stage | Model | Reason |
|-------|-------|--------|
| Classify (relevant or noise?) | `gemini-flash` or `gpt-4o-mini` | Cheapest, runs on every message |
| Entity extraction | `claude-haiku-4-5` | Reliable JSON, cost-effective |
| Transcription | `whisper-1` | Speech-to-text, not LLM |
| Answer synthesis | `claude-sonnet-4-6` | Best citation quality |

---

## Development Standards

- **Language**: TypeScript (strict mode) for all backend code
- **Testing**: TDD — tests written before or alongside implementation (Jest + Supertest)
- **Test results**: tracked in `/docs/test-results.md` after each feature implementation
- **Branches**: `feat/slack-ingestion`, `feat/query-engine`, `feat/gmail-ingestion`, etc.

---

## Team Working Agreement

- Each feature has its own branch: `feat/slack-ingestion`, `feat/query-engine`, etc.
- Backend lives in `/backend`, frontend in `/frontend` — no cross-directory edits without coordination
- All API contracts documented in `/docs/api.md` before implementation
- Use `source_id` naming convention consistently across all code
