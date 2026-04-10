# Problem Statement — Organizational Memory & Reasoning Engine

## The Core Problem

Organizations lose institutional knowledge constantly. When a team decides to choose a vendor, change an architecture, or drop a feature — that reasoning lives in a Slack thread, a meeting, or someone's inbox. Six months later, nobody remembers *why*. New team members repeat the same debates. Bad decisions get undone for the wrong reasons.

The ask: build a system that captures the **reasoning behind decisions**, not just the outcomes — and lets anyone ask questions in plain English with answers that cite exactly where the information came from.

---

## Official Problem Statement

> Build a multi-agent AI system that passively collects information from company tools (emails, chats, documents, meetings), understands and stores the reasoning behind decisions — not just what was decided — and lets anyone ask plain English questions like "Why did we choose this vendor?" or "What breaks if we change this feature?" with answers that show exactly where the information came from.

**Category**: Multi-agent AI / Organizational Intelligence
**Tech Stack (required)**: Slack · Gmail · LangChain · Neo4j · ChromaDB

---

## What the System Must Do

### 1. Passive Collection
Ingest data from:
- **Slack** — channels, threads, DMs (via Events API webhooks)
- **Gmail** — emails and threads (via Gmail API / Pub/Sub)
- **Meetings** — audio transcribed via Whisper, then processed
- **Documents** — uploaded PDFs, Notion exports, Confluence pages

### 2. Reasoning Storage
Store not just *what* was decided, but:
- Who was involved
- What reasons were given
- Which source artifacts back it up
- How decisions chain into each other

### 3. Plain English Q&A with Citations
Answer questions like:
- "Why did we choose AWS over GCP?"
- "What decisions were made in last week's vendor review?"
- "What breaks if we change the auth middleware?"

Every answer must include a **proof chain** — the exact Slack message, email, or meeting timestamp that supports the claim.

---

## Success Criteria (Demo Judges Will Look For)

1. User asks a question in natural language
2. System returns a coherent answer
3. Answer includes ranked, clickable source citations (Slack message, meeting clip, email)
4. The trail is traceable — not hallucinated

---

## What Makes This Hard

- Decisions rarely live in one place — one Slack thread + one meeting + one email together form the full picture
- Raw messages are noisy — most Slack messages are not decisions
- Provenance must survive — the link from the answer back to the source must be maintained end-to-end
- Real-time + batch — Slack is live, emails are near-real-time, meetings are async

---

## Out of Scope (Hackathon)

- Full OAuth user management per workspace
- Enterprise SSO
- Multi-tenant isolation
- Historical backfill beyond demo data
