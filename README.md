# Zeta

**AI agent marketplace — twelve plugin agents for how your team works**

---

## What it is

Zeta is a **personalized AI agent marketplace**: **twelve integrations**, each shipped as its own **plugin-style AI agent**—not a generic “features” list. **Core agents** cover **Gmail**, **Google Drive**, **Slack**, and **meetings**. **Extended agents** cover **Notion**, **GitHub**, **Jira**, **Salesforce**, **Zoho**, **Zoom**, **Microsoft 365**, and **Microsoft Teams**. Queries use **agent-to-agent (A2A)** flow: a **domain agent** talks to the tool; a **partner agent** synthesizes and responds. Turn on what you need; ask in plain English.

---

## Problem

Work splits across mail, files, chat, and calls. Jumping between apps for one answer wastes time. Zeta’s pitch is **one marketplace**: enable agents like plugins, ask once, and get answers that **cite the systems you connected**—not a black-box chat bubble.

---

## This repository

| Area | Notes |
|------|--------|
| **Frontend** | React, TypeScript, Vite, Tailwind — vintage UI, dashboard, Mail & Drive flows |
| **Backend** | Node.js, Express, TypeScript |
| **Auth** | Auth0 (server-side OIDC, cookies) |
| **Database** | PostgreSQL via Prisma + `pg` (ingest metadata, Google connections) |
| **Integrations (today)** | Google OAuth (Gmail, Drive ingest), Slack Events API → BullMQ (Redis) |
| **Agent roadmap** | Meetings plus extended marketplace agents (see product copy / `docs/ps.txt`) |
| **Hackathon PS** | LangChain, ChromaDB, Neo4j — memory & graph layer (see `docs/baseline.md`) |

---

## Getting started

```bash
cd backend
npm install && npm run dev

cd ../frontend
npm install && npm run dev
# App: http://localhost:5173 — API: http://localhost:3001
```

---

## Environment

Copy `backend/.env.example` → `backend/.env` and set at least:

```bash
PORT=3001
FRONTEND_URL=http://localhost:5173
DB_URL=postgresql://...
AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
AUTH0_BASE_URL=http://localhost:3001
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

Create `frontend/.env`:

```bash
VITE_BACKEND_URL=http://localhost:3001
```

**Auth0:** Allowed Callback URL `http://localhost:3001/auth/callback`, Logout `http://localhost:5173`, Web Origin `http://localhost:5173`.

**Google Cloud:** Enable Gmail API & Drive API. OAuth client redirect URIs:

- `http://localhost:3001/api/integrations/google/callback` (Drive)
- `http://localhost:3001/api/integrations/google-mail/callback` (Gmail)

---

## Docs

- Positioning & problem statement: [`docs/ps.txt`](docs/ps.txt)  
- Baseline / demo bar: [`docs/baseline.md`](docs/baseline.md)

---

**Twelve agents. One marketplace. Ask once—not another tab hunt.**
