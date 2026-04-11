# Zeta

Organizational Memory and Reasoning Engine for hackathon demos and real team workflows.

## Problem Statement (PS)

Teams make important decisions across email, chat, docs, and meetings. Most AI assistants answer questions as a black box, without clearly showing where the answer came from or why a decision was made.

Zeta addresses this by building a multi-agent system that:

- Passively ingests company context from connected tools.
- Preserves decision reasoning, not just final outcomes.
- Answers natural-language questions with traceable sources.

Full PS document: [docs/ps.txt](docs/ps.txt)

## Why This Is Hackathon-Ready

- Clear problem-to-solution narrative (reasoning + provenance).
- Multi-source ingestion (Slack, Gmail, Drive, Meetings hooks).
- Graph + vector memory architecture for richer retrieval.
- Demo scripts included for judge-friendly walkthroughs.

## What This Repository Contains

| Area                       | Stack / Role                                                |
| -------------------------- | ----------------------------------------------------------- |
| Frontend                   | React + TypeScript + Vite                                   |
| Backend                    | Node.js + Express + TypeScript                              |
| Auth                       | Auth0 (OIDC sessions)                                       |
| Queueing                   | BullMQ + Redis                                              |
| Relational DB              | PostgreSQL + Prisma                                         |
| Knowledge Graph            | Neo4j                                                       |
| Semantic Memory            | ChromaDB                                                    |
| Integrations (implemented) | Slack Events, Gmail, Google Drive, Recall meeting workflows |

## Architecture (High Level)

1. Ingest from integrations (Slack/Gmail/Drive/Meetings).
2. Normalize and process data via backend pipeline.
3. Store relationships in Neo4j and semantic chunks in ChromaDB.
4. Run query orchestration to retrieve, reason, and synthesize answers.
5. Return answers with source references for auditability.

## Quick Start (Docker, Recommended)

### Prerequisites

- Node.js 20+
- npm
- Docker + Docker Compose

### 1) Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update secrets in `backend/.env` (Auth0, Google, Groq, Recall as needed).

### 2) Start stack

```bash
docker compose up --build

cd frontend
npm install
npm run dev
```

Services:

- Frontend (local Vite dev server): http://localhost:5173
- Backend API: http://localhost:3001
- Neo4j Browser: http://localhost:7474
- ChromaDB: http://localhost:8000

## Local Development (Without Full Docker)

Run infrastructure with Docker, app code locally:

```bash
docker compose up -d postgres redis neo4j chromadb

cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev

cd ../frontend
npm install
npm run dev
```

## Demo Flow (Judge Mode)

Use included scripts to run a structured demo:

```bash
bash seed-demo.sh
bash demo.sh
```

Suggested demo storyline:

1. Show data arriving from multiple sources.
2. Ask a "why" question (not just "what happened").
3. Show source-backed answer and graph context.

## Environment Notes

- Backend template: `backend/.env.example`
- Frontend template: `frontend/.env.example`
- Key OAuth callback:
  - Auth0 callback: `http://localhost:3001/auth/callback`
  - Google Drive callback: `http://localhost:3001/api/integrations/google/callback`
  - Gmail callback: `http://localhost:3001/api/integrations/google-mail/callback`

## Testing

Backend unit tests:

```bash
cd backend
npm test
```

## API Health Check

```bash
curl http://localhost:3001/api/health
```

Expected response includes `ok: true`.

## Product Direction

Current implementation focuses on core organizational signals (mail, chat, docs, meetings) with a strong reasoning-first retrieval pipeline.

Marketplace-style expansion to additional domain agents remains part of the roadmap.

## Documentation

- Problem statement (PS): [docs/ps.txt](docs/ps.txt)
- Baseline and demo expectations: [docs/baseline.md](docs/baseline.md)
- Feature notes: [docs/features.md](docs/features.md)
- Pipeline architecture: [docs/pipeline-architecture.md](docs/pipeline-architecture.md)

## One-Line Pitch

Zeta helps teams ask plain-English questions about decisions and get answers grounded in real organizational evidence.
