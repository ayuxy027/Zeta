# Baseline: ideal state and PS floor

This document turns the hackathon problem statement ([`ps.txt`](ps.txt)) into a **baseline product definition**: what “good” looks like, and the **bare minimum** a demo must show to align with the PS.

---

## Problem statement (condensed)

Build an **organizational memory and reasoning** system that:

1. **Collects passively** from **emails, chats, documents, and meetings** (company tools).
2. Captures **why** things happened (**reasoning / rationale**), not only **what** was decided.
3. Answers **plain-English questions** with **grounded, traceable** responses: users can see **exactly where** each claim came from.
4. Fits a **multi-agent** mental model: specialized roles or steps working together, not one opaque blob.

Named stack in the brief: **Slack**, **Gmail**, **LangChain**, **Neo4j**, **ChromaDB**.

---

## Ideal baseline (target state)

This is the bar for a **credible, judge-ready** version of the product—not every feature at enterprise scale, but a coherent story end to end.

### Memory layer

- **Ingestion** runs **without** users manually uploading files for every answer: connectors pull or subscribe to **Slack**, **Gmail**, **documents** (e.g. Drive or uploads), and **meetings** (e.g. transcripts or calendar-linked bots), on a sensible schedule or webhook.
- **Content is chunked and indexed** with **stable source identifiers** (message id, thread, file id, meeting id, timestamp, author).
- **Vector store (Chroma or equivalent)** holds embeddings for **semantic search**; **metadata** always ties chunks back to the original source.
- **Graph store (Neo4j or equivalent)** models **entities and relationships** that matter for “why” questions—e.g. decisions ↔ vendors ↔ features ↔ owners—when the team chooses to extract structured facts from text. (If Neo4j is skipped for MVP, the demo should **say** what would live there and show one minimal graph path or a stub.)

### Reasoning layer

- The system distinguishes **decision / outcome** from **rationale** (e.g. labeled fields, separate chunks, or explicit “reasoning” nodes/edges).
- **LangChain (or equivalent orchestration)** wires: retrieval → optional graph lookup → synthesis, with **citations** required at the last step.

### Experience layer

- A single **Q&A surface** (or API) where stakeholders ask: *Why did we choose X? What breaks if we change Y?*
- Every non-trivial answer includes **provenance**: links or ids to Slack messages, email threads, doc sections, or meeting segments—not a generic summary with no sources.

### Agents

- **Multi-agent** is satisfied by a **clear decomposition**: e.g. ingest agent, retrieval agent, synthesis agent, or planner + tool-using agents—implemented or described with one **visible** split (separate prompts, separate services, or explicit agent graph in LangChain).

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
| **Reasoning vs facts** | Show **one** concrete representation: e.g. separate “rationale” snippets, labeled extraction, or graph edges that encode “because / reason / tradeoff.” |
| **Plain English Q&A** | One **working** query flow from question → answer. |
| **Provenance** | Answers cite **specific sources** (ids, permalinks, or doc anchors)—**not** uncited LLM prose. |
| **Named tools** | **Slack**, **Gmail**, **LangChain**, **Neo4j**, **ChromaDB** appear in the architecture; **unused deps** should be replaced by real usage or the README should justify swaps. |
| **Multi-agent** | **One** believable split (two agents/steps minimum) visible in code or diagram. |

---

## Out of scope for “baseline” (optional polish)

- Full enterprise security, SSO, or compliance.
- Exhaustive coverage of every channel or every employee.
- Perfect accuracy on long-horizon “why” questions without human review.

---

## How to use this file

- **Product / demo**: Check features against **Bare minimum** first; use **Ideal baseline** to prioritize stretch work.
- **Judges / README**: Point here as the single definition of “what we promised vs what we shipped.”
