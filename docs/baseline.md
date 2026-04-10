# Baseline: ideal state, PS floor, and ideation (agent workspace)

This document turns the hackathon problem statement ([`ps.txt`](ps.txt)) into a **baseline product definition**: what “good” looks like, the **bare minimum** for the PS, and how our **new ideation** (agent marketplace framing, visible trace, presenter agent) maps to build and demo choices.

---

## Blunt problem (how we pitch)

| Pain | One line |
|------|----------|
| **Black-box AI** | Answers with no trace of *which tool* was used or *what* was read. |
| **Fragmented truth** | Gmail, Slack, Drive, meetings each hold a slice; no single **narrative with sources**. |

**Wedge:** Not “we connect your stack.” **Reasoning and provenance are first-class**—users see a **chain** from question → retrieval → analysis → answer, with **sources** (and a voice that explains what happened where).

---

## Product framing (ideation)

We avoid “yet another plugin pack.” The story is a **personalized AI agent workspace**:

- Each **connected system** is a **domain agent**: e.g. **Gmail** = mailing agent, **Drive** = documents agent, **Slack** = chat agent, **meetings** = meeting/transcript agent.
- Flow: user asks in plain English → **orchestration** routes to the right agent(s) → optional **worker / analysis** on retrieved payloads (filters, extraction, cross-check) → **presentation agent** (e.g. “Sandy”) narrates timeline, uncertainty, and **sources**.

**Clarify for judges:** “Marketplace” here means **your org’s agents per connector**, not a third-party app store—unless you explicitly build that later.

---

## Problem statement (condensed, PS-aligned)

Build an **organizational memory and reasoning** system that:

1. **Collects passively** from **emails, chats, documents, and meetings** (company tools).
2. Captures **why** things happened (**reasoning / rationale**), not only **what** was decided.
3. Answers **plain-English questions** with **grounded, traceable** responses: users can see **exactly where** each claim came from.
4. Fits a **multi-agent** mental model: **domain agents** + **orchestration** + **presentation layer**, not one opaque blob.

Named stack in the brief: **Slack**, **Gmail**, **LangChain**, **Neo4j**, **ChromaDB**.

---

## Ideal baseline (target state)

This is the bar for a **credible, judge-ready** version—not enterprise scale, but one coherent story end to end.

### Memory layer

- **Ingestion** runs **without** users manually uploading files for every answer: connectors pull or subscribe to **Slack**, **Gmail**, **documents** (e.g. Drive or uploads), and **meetings** (e.g. transcripts or calendar-linked bots), on a sensible schedule or webhook.
- **Content is chunked and indexed** with **stable source identifiers** (message id, thread, file id, meeting id, timestamp, author).
- **Vector store (Chroma or equivalent)** holds embeddings for **semantic search**; **metadata** always ties chunks back to the original source.
- **Graph store (Neo4j or equivalent)** models **entities and relationships** that matter for “why” questions—e.g. decisions ↔ vendors ↔ features ↔ owners—when the team chooses to extract structured facts from text. (If Neo4j is skipped for MVP, the demo should **say** what would live there and show one minimal graph path or a stub.)

### Reasoning layer

- The system distinguishes **decision / outcome** from **rationale** (e.g. labeled fields, separate chunks, or explicit “reasoning” nodes/edges).
- **LangChain (or equivalent orchestration)** wires: retrieval → optional graph lookup → synthesis, with **citations** required at the last step.
- **Worker-style steps** (filter, extract, “analysis”) may be **real code**, **LLM calls**, or **structured LLM output** that *describes* phases—see **Experience / demo** below.

### Experience layer (frontend-forward reasoning)

- A single **Q&A surface** where stakeholders ask natural questions; **non-trivial** answers include **provenance** (ids, links, excerpts).
- **Visible trace:** UI shows ordered steps (e.g. retrieve → filter → analyze → synthesize) with optional **expandable “thinking”** per step. **Staged timing** (reveal steps over time) is acceptable for clarity and “wow.”
- **Presentation agent:** A dedicated **voice** (e.g. Sandy) that summarizes **what happened, where, and what sources support it**—so the product feels like **one brain explaining many hands**, not disconnected widgets.

### Demo strategy (wow without lying)

- **Anchor:** At least **one** real path—e.g. live Gmail/Drive/Slack fetch or real chunk ids—so “where” is defensible.
- **Metaphorical / LLM-filled trace:** Steps and copy may come from a **single structured LLM completion** (JSON schema: step labels, durations, snippets) mapped to the UI; that’s a **valid hackathon pattern** if **documented** (README or judge footnote: “trace narrative may be simulated; retrieval step X is live”).
- **Avoid:** Claiming every labeled tool (e.g. “grep”) **literally** ran if it didn’t—use accurate labels or call out “simulated workflow preview.”

### Agents (architecture)

- **Domain agents:** One per major connector (mail, docs, chat, meetings).
- **Orchestration:** Routes queries and merges context.
- **Worker / analysis:** Operates on retrieved payloads.
- **Presentation agent:** Explains timeline + sources; does **not** replace factual retrieval—**cites** Gmail/Drive/Slack/etc.

**Multi-agent** is satisfied by a **visible** split (code, prompts, or diagram): at minimum **domain agent → presenter** or **retrieve → synthesize** with distinct responsibilities.

---

## Bare minimum (PS floor)

These are the **non-negotiables** implied by [`ps.txt`](ps.txt). A hackathon demo can be small, but it should **hit each row** in some form.

| Requirement | Bare minimum |
|-------------|----------------|
| **Passive collection** | At least **two** of: email, chat, document, meeting—**automatically** or on a clear schedule (not “user pastes text only”). |
| **Documents** | Ingest text from real docs (upload or Drive-like flow) into retrievable storage. |
| **Chats** | Slack (or equivalent) path: event → **persisted** text with **source id** (not only enqueue with no storage). |
| **Email** | Gmail (or equivalent): connect and **pull or list** mail that can feed the memory pipeline (even if only a subset is indexed). |
| **Meetings** | At least **one** path: real transcript ingestion **or** a documented stub with a table/schema and one sample end-to-end—judges should not see “meetings = empty.” |
| **Reasoning vs facts** | Show **one** concrete representation: e.g. separate “rationale” snippets, labeled extraction, graph edges, **or** trace steps + presenter copy that references sources. |
| **Plain English Q&A** | One **working** query flow from question → answer. |
| **Provenance** | Answers cite **specific sources** (ids, permalinks, or doc anchors)—**not** uncited LLM prose. |
| **Named tools** | **Slack**, **Gmail**, **LangChain**, **Neo4j**, **ChromaDB** appear in the architecture; **unused deps** should be replaced by real usage or the README should justify swaps. |
| **Multi-agent** | **One** believable split (two agents/steps minimum) visible in code or diagram—**including** ideation framing (domain + presenter) if that’s what you ship. |

---

## “Ultimate wow” floor (ideation, optional but aligned)

Not required by the raw PS, but matches our **differentiation** story:

| Idea | Purpose |
|------|---------|
| **Structured trace JSON** from one LLM call | Fill step titles, fake/plausible durations, expandable blurbs—frontend maps to timeline. |
| **Staged reveal** | Steps appear sequentially (fixed delays ± jitter) so effort *reads* even if the API returned in one round-trip. |
| **Sandy / presenter card** | Final full-width “broadcast” summarizing sources and uncertainty. |
| **Sound / motion** | Light step-complete cues (polish, not scope creep). |
| **One brutal line for judges** | *“We show the chain—where we looked and what we found—not just the answer.”* |

---

## Out of scope for “baseline” (optional polish)

- Full enterprise security, SSO, or compliance.
- Exhaustive coverage of every channel or every employee.
- Perfect accuracy on long-horizon “why” questions without human review.
- A real third-party **agent marketplace** (billing, listings)—unless you scope it explicitly later.

---

## How to use this file

- **Product / demo:** Check **Bare minimum** first; add **Ultimate wow** items if time allows.
- **Ideation:** Use **Product framing** + **Experience layer** + **Demo strategy** so engineering and pitch stay aligned.
- **Judges / README:** Single place for “what we promised vs what we shipped” and **what is live vs simulated** in the trace UI.
