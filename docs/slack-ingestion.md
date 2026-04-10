# Slack Ingestion — Prerequisites, Flow & Implementation Guide

> Stack: Node.js + Express + TypeScript + BullMQ (Redis) + Neo4j + ChromaDB
> Development approach: TDD — tests written alongside implementation.

---

## Why Start with Slack?

Slack is the highest-signal, most real-time source. Decisions are discussed there before they're written anywhere else. It's also webhook-driven — the most architecturally interesting piece and the best live demo for judges.

---

## Prerequisites

### 1. Slack App Setup (Manual — One Time)

1. Go to https://api.slack.com/apps → **Create New App → From scratch**
2. App Name: `Zeta` | Workspace: your test workspace
3. **OAuth & Permissions → Bot Token Scopes**, add:
   - `channels:history` — read public channel messages
   - `channels:read` — list channels
   - `groups:history` — private channels (if needed)
   - `users:read` — resolve user IDs to display names
   - `users:read.email` — get emails for Person nodes
4. **Event Subscriptions**:
   - Enable Events → Request URL: `https://<ngrok>/slack/events`
   - Bot Events: `message.channels`, `message.groups`
5. Install App to workspace → copy **Bot User OAuth Token** (`xoxb-...`)
6. Copy **Signing Secret** from Basic Information

**Env vars needed:**
```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
```

### 2. Local Tunnel for Development

```bash
ngrok http 3000
# Paste https://xxxx.ngrok.io/slack/events into Slack Event Subscriptions
```

### 3. Backend Dependencies

```bash
# Runtime
npm install express @slack/bolt @slack/web-api bullmq ioredis
npm install @anthropic-ai/sdk neo4j-driver chromadb dotenv

# Dev / Testing
npm install -D typescript ts-node @types/express @types/node
npm install -D jest ts-jest supertest @types/supertest @types/jest
```

---

## Architecture: Full Flow

```
Slack workspace
     │
     │  POST /slack/events
     ▼
[Express Receiver]  (slack-router.ts)
  ├── Verify Slack signature (HMAC-SHA256 via @slack/bolt)
  ├── Handle URL verification challenge (one-time)
  ├── Drop payload → BullMQ job
  └── Return 200 OK immediately  ← MUST be < 3 seconds

     │
     ▼
[BullMQ Worker]  (slack-worker.ts)
  ├── Check event_id in Redis → skip if seen (dedup)
  ├── Mark event_id seen (TTL: 24h)
  ├── Fetch full thread via Slack API conversations.replies
  │
  ├── [Classifier]  cheap LLM call → { is_relevant: boolean }
  │     └── Skip if false
  │
  ├── [Entity Extractor]  Haiku → { decisions[], people[], reasons[], topics[] }
  │
  ├── [Neo4j Writer]
  │     ├── CREATE SlackMessage node
  │     ├── MERGE Person nodes
  │     ├── CREATE Decision nodes
  │     └── CREATE relationships: SUPPORTS, MADE, HAS_REASON
  │
  └── [ChromaDB Writer]
        └── Embed thread text, store with source_id metadata
```

---

## The 3-Second Rule (Critical)

Slack retries if you don't respond in 3 seconds. **Never** put LLM calls in the webhook handler. The handler drops to queue and returns immediately. All processing is async in the worker.

---

## source_id Convention

```
slack_{channelId}_{messageTs}

Example: slack_C04ABCDEF_1704856800.123456
```

This ID goes on both the Neo4j `SlackMessage` node and the ChromaDB metadata. It's the join key between the two databases.

---

## LLM Extraction Prompt

```typescript
const EXTRACTION_PROMPT = `
You are extracting structured data from a Slack thread.

Thread:
{thread_text}

Return ONLY valid JSON — no markdown, no explanation:
{
  "is_relevant": true or false,
  "decisions": ["list of decisions made as clear statements"],
  "people": ["names or Slack handles of people involved"],
  "reasons": ["reasons or rationale mentioned"],
  "topics": ["vendor", "infrastructure", "auth", etc.]
}

Rules:
- is_relevant = false if the thread is noise (standup pings, greetings, off-topic)
- A decision = a clear choice: "we will use X", "decided to drop Y"
- Reasons = the WHY behind the decision
- People = anyone who contributed meaningfully
`;
```

---

## Neo4j Schema for Slack

```cypher
// SlackMessage node
CREATE (s:SlackMessage {
  source_id: "slack_C04AB_1704856800.123456",
  channel: "C04ABCDEF",
  thread_ts: "1704856800.123456",
  timestamp: "2024-01-10T10:00:00Z",
  raw_preview: "first 200 chars..."
})

// Decision node
CREATE (d:Decision {
  text: "Use AWS for primary infrastructure",
  topic: "infrastructure",
  timestamp: "2024-01-10T10:00:00Z"
})

// Relationships
CREATE (s)-[:SUPPORTS { weight: 0.87, found_via: "llm_extraction" }]->(d)
MERGE  (p:Person { name: "Sumeet" })
CREATE (p)-[:MADE]->(d)
CREATE (r:Reason { text: "30% cheaper at scale" })
CREATE (d)-[:HAS_REASON]->(r)
```

---

## ChromaDB Write

```typescript
await collection.add({
  ids: [sourceId],
  documents: [threadText],
  metadatas: [{
    source_id: sourceId,
    source_type: "slack",
    channel: channelId,
    thread_ts: threadTs,
    timestamp: timestamp,
    topics: extracted.topics.join(","),
  }],
});
```

---

## File Structure (Backend)

```
backend/
├── src/
│   ├── index.ts                    # App entry point
│   ├── app.ts                      # Express app setup
│   ├── config.ts                   # Env vars + validation
│   ├── routers/
│   │   └── slack.router.ts         # POST /slack/events
│   ├── workers/
│   │   └── slack.worker.ts         # BullMQ consumer
│   ├── services/
│   │   ├── slack.service.ts        # Slack API calls (thread fetch, user lookup)
│   │   ├── extractor.service.ts    # LLM entity extraction
│   │   ├── neo4j.service.ts        # Neo4j write operations
│   │   └── chromadb.service.ts     # ChromaDB write operations
│   ├── queue/
│   │   └── slack.queue.ts          # BullMQ queue definition
│   └── types/
│       └── slack.types.ts          # TypeScript interfaces
├── tests/
│   ├── unit/
│   │   ├── extractor.service.test.ts
│   │   ├── neo4j.service.test.ts
│   │   └── chromadb.service.test.ts
│   └── integration/
│       └── slack.router.test.ts
├── jest.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## TDD Approach (Per Service)

For each service, the cycle is:

1. **Write the test** — define expected inputs/outputs with mocked dependencies
2. **Run it** — it fails (red)
3. **Implement** the service to pass the test (green)
4. **Refactor** if needed
5. **Document results** in `/docs/test-results.md`

### Example: extractor.service.test.ts

```typescript
describe('extractEntities', () => {
  it('returns is_relevant false for noise messages', async () => {
    const result = await extractEntities("ok standup in 5 mins @here");
    expect(result.is_relevant).toBe(false);
  });

  it('extracts decision from a clear decision thread', async () => {
    const result = await extractEntities(
      "After comparing AWS and GCP, we decided to go with AWS — 30% cheaper for our workload"
    );
    expect(result.is_relevant).toBe(true);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toContain("AWS");
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
```

---

## Implementation Order (Step by Step)

| Step | Task | TDD? |
|------|------|------|
| 1 | `backend/` scaffold — tsconfig, jest, package.json | — |
| 2 | Express app + `/health` endpoint | Yes |
| 3 | Slack router — signature verification + queue drop | Yes |
| 4 | BullMQ queue setup + worker shell | Yes |
| 5 | Slack service — `fetchThread()` | Yes (mocked Slack API) |
| 6 | Extractor service — LLM call + JSON parse | Yes (mocked LLM) |
| 7 | Neo4j service — write nodes + relationships | Yes (mocked driver) |
| 8 | ChromaDB service — embed + store | Yes (mocked client) |
| 9 | Wire worker end-to-end | Integration test |
| 10 | ngrok + live Slack test | Manual |

---

## Services Running Locally

| Service | Docker command |
|---------|---------------|
| Redis | `docker run -p 6379:6379 redis` |
| Neo4j | `docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j` |
| ChromaDB | `docker run -p 8001:8000 chromadb/chroma` |

---

## Environment Variables

```env
PORT=3000

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Redis
REDIS_URL=redis://localhost:6379

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8001
```

---

## Testing the Webhook Without a Real Workspace

```bash
curl -X POST http://localhost:3000/slack/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "event_callback",
    "event_id": "Ev123TEST",
    "event": {
      "type": "message",
      "channel": "C04ABCDEF",
      "user": "U04XYZ",
      "text": "We decided to go with AWS over GCP — 30% cheaper for our workload",
      "ts": "1704856800.123456",
      "thread_ts": "1704856800.123456"
    }
  }'
```

> Note: Disable signature verification in dev mode (`NODE_ENV=development`) or mock the HMAC check.
