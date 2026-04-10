# PRD — Zeta: Organizational Memory & Reasoning Engine

**Version**: 1.0  
**Status**: In Development  
**Team**: Hackathon — Multi-developer  

---

## 1. Problem

Organizations bleed institutional knowledge constantly. When a team decides to pick a vendor, change an architecture, or kill a feature — the reasoning lives in a Slack thread, a meeting recording, or someone's inbox. Months later no one remembers *why*. New team members repeat the same debates. Decisions get reversed for the wrong reasons.

Existing tools (Notion, Confluence, wikis) only store *what* was decided — they require humans to manually document, and they capture no provenance. The context dies with the conversation.

---

## 2. Solution

**Zeta** is a multi-agent AI system that passively listens to company communication channels, extracts and stores the *reasoning* behind decisions with full source attribution, and answers plain-English questions with cited evidence.

> "Why did we choose AWS?" → Answer + the Slack thread + the meeting + the email that proves it.

---

## 3. Core User Stories

| As a… | I want to… | So that… |
|--------|-----------|----------|
| New engineer | Ask why a past decision was made | I understand context without bothering the team |
| Engineering lead | Query what breaks if we change X | I assess impact before making changes |
| Product manager | See what was discussed in last week's meeting | I don't need to watch the full recording |
| Anyone | Get answers with source citations | I can trust the answer and verify it myself |

---

## 4. Key Capabilities

### 4.1 Passive Ingestion
- **Slack** — real-time via Events API webhooks; captures threads, not just messages
- **Gmail** — near real-time via Pub/Sub push notifications; captures threads
- **Meetings** — audio uploaded and transcribed via Whisper; chunked by speaker
- **Documents** — PDF / plain text uploads batch-ingested

### 4.2 Reasoning Storage
Every ingested artifact is processed to extract:
- **Decisions** — what was chosen or agreed upon
- **Reasons** — the *why* behind each decision
- **People** — who was involved and in what role
- **Topics** — subject classification (vendor, infrastructure, auth, etc.)

Extracted entities are stored as a **knowledge graph** (Neo4j), not flat text. Relationships between entities are first-class — decisions link to their sources, reasons, people, and follow-up decisions.

### 4.3 Semantic Search + Graph Traversal
At query time, two retrieval mechanisms work together:
- **ChromaDB** — finds semantically relevant content chunks across all sources
- **Neo4j** — traverses the graph to surface the full proof chain behind those chunks

Neither alone is sufficient. Vector search finds *what's relevant*. Graph traversal finds *what's connected and why*.

### 4.4 Cited Answers
The LLM synthesizes a coherent answer from graph + vector context, and every claim is attributed to a specific source artifact with timestamp and author.

---

## 5. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
│                                                                 │
│   Slack          Gmail          Meetings         Documents      │
│  (webhook)     (Pub/Sub)    (audio upload)    (file upload)     │
└────┬─────────────┬───────────────┬──────────────────┬──────────┘
     │             │               │                  │
     ▼             ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                             │
│                  Node.js + Express API                          │
│                                                                 │
│  POST /slack/events   POST /gmail/webhook                       │
│  POST /ingest/meeting  POST /ingest/document                    │
│                                                                 │
│  → Signature verification → Drop to BullMQ queue → 200 OK      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING PIPELINE                         │
│                    BullMQ Workers (Redis)                       │
│                                                                 │
│  1. Dedup          check event_id in Redis (TTL 24h)            │
│  2. Enrich         fetch full thread / transcript               │
│  3. Classify       LLM → is this relevant? (cheap model)        │
│  4. Extract        LLM → decisions, people, reasons, topics     │
│  5. Dual write     → Neo4j  +  ChromaDB  (same source_id)       │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│       Neo4j              │    │          ChromaDB               │
│   Knowledge Graph        │    │        Vector Store             │
│                          │    │                                 │
│  Nodes:                  │    │  - Raw text chunks              │
│  Decision, Person,       │    │  - Embedded (text-embedding)    │
│  Reason, Meeting,        │    │  - Tagged with source_id        │
│  SlackMessage, Email,    │    │  - Filterable by source_type,   │
│  Document                │    │    channel, date, topic         │
│                          │    │                                 │
│  Relationships:          │    │                                 │
│  MADE, ATTENDED,         │    │                                 │
│  PRODUCED, HAS_REASON,   │    │                                 │
│  SUPPORTS {weight},      │    │                                 │
│  FOLLOWED_UP_WITH        │    │                                 │
└──────────────┬───────────┘    └──────────────┬──────────────────┘
               │                               │
               └──────────────┬────────────────┘
                              │  source_id is the join key
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUERY ENGINE                               │
│                LangChain Orchestration                          │
│                                                                 │
│  User question                                                  │
│       │                                                         │
│       ├─→ ChromaDB semantic search → top-k chunks + scores      │
│       │                                                         │
│       ├─→ Neo4j graph traversal → decisions + people + reasons  │
│       │       (starting from source_ids returned by ChromaDB)   │
│       │                                                         │
│       └─→ LLM synthesis (Claude Sonnet)                         │
│               → Answer + ranked source citations                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
│                                                                 │
│  Chat interface → plain English question                        │
│  Answer display → response text                                 │
│  Evidence trail → source cards (Slack / Gmail / Meeting / Doc)  │
│  Source badges  → timestamp, author, channel                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Flow — Single Slack Message End to End

```
1.  User sends message in Slack channel
2.  Slack → POST /slack/events (webhook)
3.  Express verifies HMAC-SHA256 signature
4.  Payload dropped to BullMQ (Redis) → 200 OK returned in <1s
5.  Worker picks up job
6.  Worker checks Redis: event_id seen? → skip (dedup)
7.  Worker calls Slack API conversations.replies → full thread
8.  LLM (cheap): "is this thread relevant?" → false → discard
                                             → true → continue
9.  LLM (Haiku): extract → { decisions[], people[], reasons[], topics[] }
10. source_id generated: slack_{channelId}_{threadTs}
11. Neo4j write:
      CREATE (s:SlackMessage { source_id, channel, ts })
      CREATE (d:Decision { text, topic, timestamp })
      CREATE (s)-[:SUPPORTS { weight: 0.87 }]->(d)
      MERGE  (p:Person { name })
      CREATE (p)-[:MADE]->(d)
      CREATE (r:Reason { text })
      CREATE (d)-[:HAS_REASON]->(r)
12. ChromaDB write:
      embed(thread_text) → store with { source_id, source_type: "slack", ... }
```

---

## 7. Neo4j Graph Schema

### Nodes

| Node | Key Properties |
|------|---------------|
| `Decision` | `text`, `topic`, `timestamp` |
| `Person` | `name`, `email`, `slack_id` |
| `Reason` | `text` |
| `Meeting` | `title`, `date`, `source_id` |
| `SlackMessage` | `source_id`, `channel`, `thread_ts`, `timestamp` |
| `Email` | `source_id`, `subject`, `sender`, `timestamp` |
| `Document` | `source_id`, `title`, `url` |

### Relationships

| Relationship | Direction | Properties |
|-------------|-----------|-----------|
| `MADE` | Person → Decision | — |
| `ATTENDED` | Person → Meeting | — |
| `PRODUCED` | Meeting → Decision | — |
| `HAS_REASON` | Decision → Reason | — |
| `SUPPORTS` | SlackMessage / Email / Document → Decision | `weight` (0–1), `found_via` |
| `FOLLOWED_UP_WITH` | Decision → Decision | — |
| `REFERENCES` | Document → Decision | — |

### The `source_id` Bridge

Every node that originates from a raw artifact carries a `source_id` that matches its ChromaDB entry. This is the join key — given any Neo4j node, you can fetch the full raw text from ChromaDB. Given any ChromaDB chunk, you can traverse the graph.

---

## 8. LLM Model Strategy

| Stage | Model | Frequency | Reason |
|-------|-------|-----------|--------|
| Relevance classify | `gpt-4o-mini` | Every message | Cheapest, yes/no only |
| Entity extraction | `claude-haiku-4-5` | Post-filter messages | Reliable JSON, 200k context |
| Audio transcription | `whisper-1` | Per meeting | Speech-to-text |
| Answer synthesis | `claude-sonnet-4-6` | Per user query | Best citation quality |

**Estimated hackathon cost**: ~$1.50 total for 500 ingested messages + 30 demo queries.

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js 20+ |
| Backend framework | Express 5 |
| Language | TypeScript (strict) |
| Job queue | BullMQ (Redis-backed) |
| Graph database | Neo4j 5 |
| Vector database | ChromaDB |
| In-memory / queue store | Redis |
| AI orchestration | LangChain (JS) |
| LLM provider | Anthropic (Haiku + Sonnet) |
| Transcription | OpenAI Whisper |
| Frontend framework | React 18 + Vite |
| Frontend language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Auth0 (optional for hackathon) |
| Local tunnel | ngrok |
| Testing | Jest + Supertest |
| Dev approach | TDD |

---

## 10. API Surface

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Health check |
| `POST` | `/slack/events` | Slack webhook receiver |
| `POST` | `/gmail/webhook` | Gmail Pub/Sub receiver |
| `POST` | `/api/ingest/meeting` | Upload meeting audio |
| `POST` | `/api/ingest/document` | Upload document |
| `POST` | `/api/query` | Ask a plain-English question |
| `GET` | `/api/auth/me` | Current user info (Auth0) |

### Query Request / Response Shape

```typescript
// POST /api/query
{ "question": "Why did we choose AWS over GCP?" }

// Response
{
  "answer": "AWS was selected for cost reasons — 30% cheaper at our compute scale.",
  "sources": [
    {
      "source_type": "slack",
      "source_id": "slack_C04AB_1704856800",
      "preview": "After comparing both — AWS wins on pricing for us",
      "author": "Sumeet",
      "timestamp": "2024-01-10T10:00:00Z",
      "confidence": 0.94
    },
    {
      "source_type": "meeting",
      "source_id": "meeting_transcript_xyz",
      "preview": "Vendor review — infrastructure decision finalized",
      "timestamp": "2024-01-12T14:00:00Z",
      "confidence": 0.87
    }
  ]
}
```

---

## 11. Feature Status

| Feature | Status |
|---------|--------|
| F1 — Slack ingestion (webhook → queue → worker) | **Complete** |
| F2 — LLM entity extraction | Not started |
| F3 — Neo4j writer | Not started |
| F4 — ChromaDB writer | Not started |
| F5 — Gmail ingestion | Not started |
| F6 — Meeting transcription pipeline | Not started |
| F7 — Document ingestion | Not started |
| F8 — Query engine (LangChain orchestration) | Not started |
| F9 — Frontend chat UI + evidence trail | Not started |
| Landing page + routing | **Complete** |

---

## 12. Project Structure

```
Zeta/
├── frontend/                  # React + Vite + TypeScript
│   └── src/
│       ├── pages/             # LandingPage, DashboardPage, etc.
│       └── components/        # landing/, common/, effects/
│
├── backend/                   # Node.js + Express + TypeScript
│   └── src/
│       ├── server.ts          # App entry point
│       ├── config.ts          # Env vars
│       ├── routers/
│       │   └── slack.router.ts
│       ├── workers/
│       │   └── slack.worker.ts
│       ├── queue/
│       │   └── slack.queue.ts
│       ├── services/          # extractor, neo4j, chromadb, slack (to build)
│       └── types/
│           └── slack.types.ts
│
└── docs/
    ├── prd.md                 # This file
    ├── problem-statement.md
    ├── features.md
    ├── slack-ingestion.md
    └── test-results.md        # TDD results per feature
```

---

## 13. Team Working Agreement

- **Backend** lives in `/backend` — frontend devs do not touch this
- **Frontend** lives in `/frontend` — backend devs do not touch this
- **Branch per feature**: `feat/slack-ingestion`, `feat/neo4j-writer`, `feat/query-engine`
- **No force pushes to main**
- **`source_id` naming is sacred** — format is `{source_type}_{identifier}_{ts}`, consistent across Neo4j and ChromaDB
- **All API contracts documented** in this PRD before implementation begins
- **TDD**: tests written alongside implementation, results logged in `docs/test-results.md`
