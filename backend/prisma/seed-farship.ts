/**
 * Farship / WEAVE Demo Seed — Batch 1: Foundation
 * Run: npm run db:seed:farship
 */

import { PrismaClient } from "@prisma/client";
import { ChromaClient } from "chromadb";
import neo4j from "neo4j-driver";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "../.env") });

const prisma = new PrismaClient();

// ── Types ──────────────────────────────────────────────────────────────────────
export interface SeedPayload {
  source_id: string;
  source_type: "slack" | "gmail" | "drive" | "meeting";
  raw_text: string;
  metadata: { author?: string; timestamp: string; subject?: string; channel?: string; url?: string };
}
export interface SeedEntities {
  is_relevant: boolean;
  decisions: string[];
  people: string[];
  reasons: string[];
  topics: string[];
}

// ── IDs ────────────────────────────────────────────────────────────────────────
export const TEAM_ID  = "T_FARSHIP01";
export const C_GENERAL = "C_FAR_GEN";
export const C_DEV     = "C_FAR_DEV";
export const C_DESIGN  = "C_FAR_DSN";
export const C_PRODUCT = "C_FAR_PRD";
export const C_STANDUP = "C_FAR_STD";
export const U_SUMIT   = "U_FAR_SUMIT";
export const U_AYUSH   = "U_FAR_AYUSH";
export const U_SWAPNIL = "U_FAR_SWAPNIL";

// ── Timestamp helpers ──────────────────────────────────────────────────────────
export function slackTs(m: number, d: number, h = 10, min = 0, s = 0): string {
  const ms = new Date(2026, m - 1, d, h, min, s, 0).getTime();
  return `${Math.floor(ms / 1000)}.${String((ms % 1000) * 1000).padStart(6, "0")}`;
}
export function isoDate(m: number, d: number, h = 10, min = 0): Date {
  return new Date(2026, m - 1, d, h, min, 0);
}
export function emailDate(m: number, d: number, h = 10): string {
  return new Date(2026, m - 1, d, h, 0, 0).toUTCString();
}

// ── Embedding ──────────────────────────────────────────────────────────────────
async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY required");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests: texts.map((text) => ({ model: "models/gemini-embedding-001", content: { parts: [{ text }] } })) }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = (await res.json()) as { embeddings: { values: number[] }[] };
  return data.embeddings.map((e) => e.values);
}

export async function batchUpsertChroma(
  collection: Awaited<ReturnType<ChromaClient["getOrCreateCollection"]>>,
  payloads: SeedPayload[],
  label: string,
  batchSize = 50,
): Promise<void> {
  console.log(`  Embedding ${payloads.length} ${label} docs...`);
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    const embeddings = await embedTexts(batch.map((p) => p.raw_text));
    await collection.upsert({
      ids: batch.map((p) => p.source_id),
      documents: batch.map((p) => p.raw_text),
      embeddings,
      metadatas: batch.map((p) => ({
        source_id: p.source_id, source_type: p.source_type,
        timestamp: p.metadata.timestamp, author: p.metadata.author ?? "",
        subject: p.metadata.subject ?? "", channel: p.metadata.channel ?? "", url: p.metadata.url ?? "",
      })),
    });
    console.log(`    ${label}: ${Math.min(i + batchSize, payloads.length)}/${payloads.length}`);
  }
}

// ── Slack Data ─────────────────────────────────────────────────────────────────
// 220 messages · 5 channels · Jan–Mar 2026 · Farship team building WEAVE

export interface SlackSeed {
  id: string; ch: string; slackUser: string; text: string;
  m: number; d: number; h: number; min?: number;
  threadId?: string; // parent message ID for replies
  entities: SeedEntities;
}

export const SLACK_MESSAGES: SlackSeed[] = [
  // ── JANUARY: Inception & Planning ────────────────────────────────────────────

  // #general
  { id: "s_gen_001", ch: C_GENERAL, slackUser: U_SUMIT, m: 1, d: 3, h: 9,
    text: "alright team, welcome to Farship HQ 🎉 this is our main workspace for the WEAVE project. quick housekeeping — #weave-dev for all technical stuff, #product for roadmap/clients, #design for ui/ux, #standup for daily updates. let's build something people actually use",
    entities: { is_relevant: true, decisions: ["Use separate Slack channels: #weave-dev, #product, #design, #standup"], people: ["Sumit"], reasons: ["Keep discussions organized across dev, product, and design tracks"], topics: ["team", "process"] } },

  { id: "s_gen_002", ch: C_GENERAL, slackUser: U_SWAPNIL, m: 1, d: 3, h: 9, min: 30,
    text: "quick role clarity so we're all on the same page:\n- Sumit: backend, AI pipeline, infra\n- Ayush: frontend, component library, UX implementation\n- Swapnil (me): product, client relationships, design direction\nwe'll overlap obviously but this keeps ownership clear",
    entities: { is_relevant: true, decisions: ["Sumit owns backend and AI pipeline, Ayush owns frontend, Swapnil owns product and clients"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["Clear ownership prevents bottlenecks and confusion"], topics: ["team", "roles"] } },

  { id: "s_gen_003", ch: C_GENERAL, slackUser: U_AYUSH, m: 1, d: 3, h: 10,
    text: "makes sense. one thing i want to flag early — let's use Linear for task tracking, not Notion or Jira. linear is fast, integrates with GitHub, and we won't waste time configuring it. i'll set up the workspace today",
    entities: { is_relevant: true, decisions: ["Use Linear for task tracking instead of Notion or Jira"], people: ["Ayush"], reasons: ["Linear is fast, GitHub-integrated, and zero configuration overhead"], topics: ["process", "tooling"] } },

  { id: "s_gen_004", ch: C_GENERAL, slackUser: U_SUMIT, m: 1, d: 3, h: 10, min: 15,
    text: "agreed on Linear. also — all env secrets go in 1Password. no .env files committed ever. i'll share the vault link in DM",
    entities: { is_relevant: true, decisions: ["Use 1Password for all environment secrets, never commit .env files"], people: ["Sumit"], reasons: ["Security hygiene from day one"], topics: ["security", "process"] } },

  // #product — Month 1
  { id: "s_prd_001", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 1, d: 4, h: 10,
    text: "ok so i spent the weekend doing competitive research. here's what i found:\n\nGamma: best AI generation right now, feels like magic but templates are rigid and export is weak\nBeautiful.ai: polished but expensive ($12/mo) and slow generation\nCanva AI: broad audience, not really for professionals, very template-locked\n\nWEAVE's angle: faster generation than gamma, better export (native PPT+PDF), and designed for startup/agency workflows not general consumers",
    entities: { is_relevant: true, decisions: ["WEAVE differentiates from Gamma via faster generation, better PPT/PDF export, and startup/agency focus"], people: ["Swapnil"], reasons: ["Gamma has weak export, Beautiful.ai is expensive, Canva is too generic"], topics: ["product", "competitive-analysis", "positioning"] } },

  { id: "s_prd_002", ch: C_PRODUCT, slackUser: U_SUMIT, m: 1, d: 4, h: 10, min: 45,
    text: "good breakdown. on the export side — native PPT export is non-trivial. we'll need a library like pptxgenjs or python-pptx. i'd lean pptxgenjs since we're already in node. the PDF side is easier, just headless chrome / puppeteer render",
    entities: { is_relevant: true, decisions: ["Use pptxgenjs for native PPT export and Puppeteer for PDF export"], people: ["Sumit"], reasons: ["pptxgenjs is Node-native, Puppeteer handles PDF easily via headless Chrome"], topics: ["export", "technical", "backend"] } },

  { id: "s_prd_003", ch: C_PRODUCT, slackUser: U_AYUSH, m: 1, d: 4, h: 11,
    text: "for the 'faster generation' angle — the UX trick is to stream slide content as it generates. so user sees slide 1 appear while slide 2-5 are still generating. gamma does this but it's laggy. if we get this right it'll feel instant even if actual latency is 8-10s",
    entities: { is_relevant: true, decisions: ["Stream slide content progressively during AI generation for perceived speed improvement"], people: ["Ayush"], reasons: ["Reduces perceived latency even if total generation time is 8-10 seconds, better UX than Gamma"], topics: ["product", "ux", "performance"] } },

  { id: "s_prd_004", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 1, d: 6, h: 9,
    text: "talked to Rohan from Arkade Studio yesterday. they make pitch decks for D2C startups. currently using Gamma + manual edits in Figma (!!). their pain: gamma output needs too much cleanup, export to PPT breaks formatting. they're interested in a beta. this could be our first real customer",
    entities: { is_relevant: true, decisions: ["Target Arkade Studio as first beta customer"], people: ["Swapnil", "Rohan"], reasons: ["Arkade Studio's current workflow with Gamma+Figma has high manual effort and export issues"], topics: ["client", "sales", "product"] } },

  { id: "s_prd_005", ch: C_PRODUCT, slackUser: U_SUMIT, m: 1, d: 6, h: 9, min: 30,
    text: "that's a great fit. let's make sure export quality is genuinely better than gamma before we demo to them. i'd say we need at least a working prototype by end of jan",
    entities: { is_relevant: true, decisions: ["Deliver working WEAVE prototype to Arkade Studio by end of January"], people: ["Sumit"], reasons: ["Arkade Studio is a target beta customer and export quality must exceed Gamma"], topics: ["milestone", "client", "product"] } },

  // #weave-dev — Month 1 technical decisions
  { id: "s_dev_001", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 5, h: 10,
    text: "ok let's nail the tech stack today. here's my thinking:\n\nBackend: Node.js + Express (we know it, fast to ship)\nDB: Neon (serverless postgres, free tier is generous, no docker for dev)\nAI: need to evaluate — GPT-4o vs Claude 3.5 Sonnet vs Gemini 1.5 Pro\nInfra: Vercel for frontend, Railway for backend\n\nthoughts?",
    entities: { is_relevant: true, decisions: ["Use Node.js + Express for backend, Neon for database, Vercel for frontend, Railway for backend deployment"], people: ["Sumit"], reasons: ["Team familiarity with Node, Neon has generous free tier, Vercel/Railway are zero-config deploys"], topics: ["tech-stack", "infrastructure", "backend"] } },

  { id: "s_dev_002", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 5, h: 10, min: 20, threadId: "s_dev_001",
    text: "frontend: i'm going Next.js 14 with App Router. we need SSR for the public-facing landing page and the share link feature (SEO matters). for the editor itself it'll be client-only. tailwind + shadcn/ui for components",
    entities: { is_relevant: true, decisions: ["Use Next.js 14 App Router for frontend with Tailwind and shadcn/ui"], people: ["Ayush"], reasons: ["SSR needed for landing page SEO and share links, shadcn/ui is unstyled and flexible"], topics: ["frontend", "tech-stack"] } },

  { id: "s_dev_003", ch: C_DEV, slackUser: U_SWAPNIL, m: 1, d: 5, h: 10, min: 35, threadId: "s_dev_001",
    text: "one thing on Neon — make sure it doesn't have cold start issues. last project i used PlanetScale and the first query after idle was like 3-4 seconds. not acceptable for a presentation tool",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_004", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 5, h: 11, threadId: "s_dev_001",
    text: "neon has connection pooling via their proxy, shouldn't be an issue. and our data access patterns are simple enough that cold starts won't matter — we're not doing heavy joins",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_005", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 7, h: 11,
    text: "AI model evaluation results:\n\nGPT-4o: best structured output (JSON), fastest for our use case, $0.005/1k tokens output\nClaude 3.5 Sonnet: better writing quality, but slightly worse at following complex JSON schemas\nGemini 1.5 Pro: cheapest, good quality, but less predictable formatting\n\nDecision: GPT-4o as primary. Claude 3.5 as fallback if GPT-4o hits rate limits. We'll abstract behind a provider interface so we can swap later",
    entities: { is_relevant: true, decisions: ["Use GPT-4o as primary AI model with Claude 3.5 Sonnet as fallback, abstracted behind a provider interface"], people: ["Sumit"], reasons: ["GPT-4o best for structured JSON output, Claude 3.5 has better prose quality, abstraction allows future model swaps"], topics: ["ai-model", "architecture", "backend"] } },

  { id: "s_dev_006", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 7, h: 11, min: 30, threadId: "s_dev_005",
    text: "the provider interface idea is smart. also means we can offer model choice as a premium feature later — 'use Claude for higher quality writing' type thing",
    entities: { is_relevant: true, decisions: ["Model choice (GPT-4o vs Claude) can become a premium feature differentiator"], people: ["Ayush"], reasons: ["Provider abstraction enables future monetization through model selection"], topics: ["product", "monetization", "ai-model"] } },

  { id: "s_dev_007", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 8, h: 10,
    text: "auth: going with Clerk. i know we've debated NextAuth but Clerk handles the full auth UI out of the box, has organization-level features we'll need later (team workspaces), and the free tier is 10k MAU. NextAuth would take a week to implement properly",
    entities: { is_relevant: true, decisions: ["Use Clerk for authentication instead of NextAuth"], people: ["Sumit"], reasons: ["Clerk includes auth UI, organization features, and 10k MAU free tier, NextAuth would take a full week to implement"], topics: ["auth", "tech-stack"] } },

  { id: "s_dev_008", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 8, h: 10, min: 20, threadId: "s_dev_007",
    text: "agreed. clerk's webhooks are also much cleaner than NextAuth for syncing user data to our own DB",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_009", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 10, h: 14,
    text: "slide schema locked in. each presentation is a JSON document with this shape:\n{\n  id, title, theme, slides: [\n    { id, layout, title, content: string[], bullets: string[], speakerNotes: string, imagePrompt?: string }\n  ]\n}\nstoring as JSONB in postgres. no separate slides table for now — keep it simple for v1",
    entities: { is_relevant: true, decisions: ["Store presentation as JSONB in Postgres instead of normalized slides table for v1"], people: ["Sumit"], reasons: ["JSONB is simpler for v1, avoids complex joins for a document-oriented data model"], topics: ["database", "schema", "backend"] } },

  { id: "s_dev_010", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 10, h: 14, min: 30, threadId: "s_dev_009",
    text: "good. one question — imagePrompt in the schema: are we doing image generation in v1? that adds a lot of complexity (DALL-E calls, storage, CDN)",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_011", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 10, h: 15, threadId: "s_dev_009",
    text: "NOT in v1. imagePrompt is there as metadata only. we'll use Unsplash API for stock images — free, fast, no generation latency. image generation is v2",
    entities: { is_relevant: true, decisions: ["Use Unsplash API for slide images in v1, defer AI image generation to v2"], people: ["Sumit"], reasons: ["Image generation adds latency and complexity, Unsplash API is free and fast enough for v1"], topics: ["product", "scope", "backend"] } },

  { id: "s_dev_012", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 13, h: 11,
    text: "slide editor component decision: i evaluated Tiptap (rich text), Quill, and a custom canvas approach. going with a custom React approach using contentEditable + our own toolbar. Tiptap is overkill for what we need, and canvas would mean reimplementing text rendering from scratch",
    entities: { is_relevant: true, decisions: ["Build custom slide editor using React with contentEditable instead of Tiptap or canvas approach"], people: ["Ayush"], reasons: ["Tiptap is overkill, canvas approach requires reimplementing text rendering, custom approach gives us exact control"], topics: ["frontend", "editor", "tech-stack"] } },

  { id: "s_dev_013", ch: C_DEV, slackUser: U_SWAPNIL, m: 1, d: 13, h: 11, min: 15, threadId: "s_dev_012",
    text: "one ask from product side — the editor needs to feel 'slide-like'. not like a doc editor. keep the aspect ratio fixed at 16:9 and the slide as a visual canvas, not just text boxes stacked",
    entities: { is_relevant: true, decisions: ["Slide editor must maintain 16:9 aspect ratio as a fixed visual canvas, not a document layout"], people: ["Swapnil"], reasons: ["Product requirement: editor should feel like a presentation tool, not a document editor"], topics: ["product", "design", "ux"] } },

  { id: "s_dev_014", ch: C_DEV, slackUser: U_AYUSH, m: 1, d: 14, h: 9,
    text: "state management: using Zustand. not Redux or Context. Zustand is lightweight, works great for presentation state (current slide, edit mode, dirty state, undo history). Redux is too much ceremony for this",
    entities: { is_relevant: true, decisions: ["Use Zustand for frontend state management instead of Redux or Context API"], people: ["Ayush"], reasons: ["Zustand is lightweight and works well for presentation state like current slide, edit mode, and undo history"], topics: ["frontend", "state-management", "tech-stack"] } },

  { id: "s_dev_015", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 15, h: 10,
    text: "backend folder structure settled:\n/src\n  /routes — express route handlers\n  /services — business logic (ai, export, storage)\n  /db — prisma client + migrations\n  /middleware — auth, rate limiting\n  /utils — helpers\n\ngoing with a flat service architecture for now, no DDD or clean arch — too early to know the right domain boundaries",
    entities: { is_relevant: true, decisions: ["Use flat service architecture for backend instead of DDD or Clean Architecture"], people: ["Sumit"], reasons: ["Too early to know the right domain boundaries for v1, simpler to refactor later"], topics: ["backend", "architecture"] } },

  { id: "s_dev_016", ch: C_DEV, slackUser: U_SUMIT, m: 1, d: 20, h: 15,
    text: "AI generation prompt is working well now. key insight: treating each slide as a separate generation call (not the whole deck at once) gives much better quality and lets us stream. a 10-slide deck takes ~12s total but the user sees the first slide in ~2s",
    entities: { is_relevant: true, decisions: ["Generate each slide individually and in parallel to enable streaming rather than batch-generating the entire deck"], people: ["Sumit"], reasons: ["Per-slide generation improves quality and enables streaming, first slide appears in 2s"], topics: ["ai-pipeline", "performance", "backend"] } },

  // #design — Month 1
  { id: "s_dsn_001", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 1, d: 6, h: 14,
    text: "WEAVE brand direction: i want it to feel like a premium creative tool, not a productivity app. think Framer or Linear — dark mode by default, sharp typography, subtle animations. NOT like Google Slides or PowerPoint. we're targeting design-conscious people",
    entities: { is_relevant: true, decisions: ["WEAVE brand direction: premium creative tool aesthetic (dark mode, sharp typography), not productivity-app feel"], people: ["Swapnil"], reasons: ["Target audience is design-conscious startup/agency users who want quality over familiarity"], topics: ["brand", "design"] } },

  { id: "s_dsn_002", ch: C_DESIGN, slackUser: U_AYUSH, m: 1, d: 6, h: 14, min: 30, threadId: "s_dsn_001",
    text: "fully agree. on the typography front — Inter for UI, we need a display font for slide headings. i'm looking at Cal Sans, Satoshi, or Geist. all free. leaning Satoshi, it's warm but professional",
    entities: { is_relevant: true, decisions: ["Use Inter for UI typography and Satoshi for slide display headings"], people: ["Ayush"], reasons: ["Satoshi is free, warm but professional, suits the premium creative tool aesthetic"], topics: ["typography", "design", "brand"] } },

  { id: "s_dsn_003", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 1, d: 7, h: 11,
    text: "theme system: we need at least 6 launch themes. i'm thinking: Minimal (white/black), Ocean (deep blue/teal), Forest (dark green), Ember (warm orange/dark), Corporate (navy/grey), and one wild card. each theme should work for the slide backgrounds AND the UI chrome",
    entities: { is_relevant: true, decisions: ["Launch with 6 built-in themes: Minimal, Ocean, Forest, Ember, Corporate, and one experimental theme"], people: ["Swapnil"], reasons: ["6 themes provides enough variety for launch without overwhelming the UX"], topics: ["themes", "design", "product"] } },

  { id: "s_dsn_004", ch: C_DESIGN, slackUser: U_AYUSH, m: 1, d: 9, h: 10,
    text: "component library decision: shadcn/ui. i know Swapnil mentioned Radix directly but shadcn gives us pre-built accessible components on top of Radix primitives. i've built with both — shadcn saves at least a week. we can always override styles",
    entities: { is_relevant: true, decisions: ["Use shadcn/ui for component library instead of raw Radix primitives"], people: ["Ayush"], reasons: ["shadcn/ui provides pre-built accessible components on Radix, saves at least a week compared to building from Radix directly"], topics: ["frontend", "component-library", "design"] } },

  { id: "s_dsn_005", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 1, d: 9, h: 10, min: 20, threadId: "s_dsn_004",
    text: "ok fair. as long as the custom slide canvas doesn't feel constrained by shadcn patterns — that part should feel fully custom",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // #standup — Month 1
  { id: "s_std_001", ch: C_STANDUP, slackUser: U_SUMIT, m: 1, d: 6, h: 9,
    text: "standup Jan 6:\n✅ yesterday: set up Neon DB, Prisma schema v1, Railway deployment pipeline\n🔨 today: starting AI generation service, model evaluation\n❌ blockers: none\nnotes: Neon connection pooling is working great, 0 cold starts",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_002", ch: C_STANDUP, slackUser: U_AYUSH, m: 1, d: 6, h: 9, min: 10,
    text: "standup Jan 6:\n✅ yesterday: Next.js scaffold, Clerk auth working, basic routing\n🔨 today: slide editor component POC\n❌ blockers: none yet\nnotes: shadcn/ui setup is clean, dark mode is working out of the box",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_003", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 1, d: 6, h: 9, min: 20,
    text: "standup Jan 6:\n✅ yesterday: competitive research, Arkade Studio call\n🔨 today: writing product requirements doc, defining v1 scope\n❌ blockers: need Sumit to confirm API shape for slide generation so i can set client expectations",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_004", ch: C_STANDUP, slackUser: U_SUMIT, m: 1, d: 13, h: 9,
    text: "standup Jan 13:\n✅ yesterday: GPT-4o integration done, slide generation working end-to-end (no streaming yet)\n🔨 today: implement streaming via SSE\n❌ blockers: Railway free tier has 512mb RAM limit — hitting it during parallel slide generation. upgrading to paid",
    entities: { is_relevant: true, decisions: ["Upgrade Railway backend to paid plan due to 512MB RAM limit being hit during parallel slide generation"], people: ["Sumit"], reasons: ["Free tier RAM limit causes failures during parallel GPT-4o calls for slide generation"], topics: ["infrastructure", "deployment"] } },

  { id: "s_std_005", ch: C_STANDUP, slackUser: U_AYUSH, m: 1, d: 13, h: 9, min: 10,
    text: "standup Jan 13:\n✅ yesterday: slide canvas working in 16:9, Zustand store set up, can render AI-generated slides\n🔨 today: toolbar implementation, slide reordering drag-and-drop\n❌ blockers: Framer Motion perf on mobile is rough, investigating",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_006", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 1, d: 13, h: 9, min: 15,
    text: "standup Jan 13:\n✅ yesterday: product requirements v1 done, sent to Ayush + Sumit for review\n🔨 today: Arkade Studio follow-up, define what 'beta ready' looks like\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_007", ch: C_STANDUP, slackUser: U_SUMIT, m: 1, d: 20, h: 9,
    text: "standup Jan 20:\n✅ yesterday: SSE streaming done, first slide renders in 1.8s now 🎉\n🔨 today: PPT export via pptxgenjs\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_008", ch: C_STANDUP, slackUser: U_AYUSH, m: 1, d: 20, h: 9, min: 10,
    text: "standup Jan 20:\n✅ yesterday: drag-to-reorder slides working, Framer Motion perf issue fixed (was using layout animations unnecessarily)\n🔨 today: theme switcher UI\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_009", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 1, d: 20, h: 9, min: 15,
    text: "standup Jan 20:\n✅ yesterday: Arkade Studio NDA signed, scheduled beta kickoff call Jan 28\n🔨 today: finalizing WEAVE v1 feature list with Sumit for the Arkade demo\n❌ blockers: need PPT export working before the 28th",
    entities: { is_relevant: true, decisions: ["Arkade Studio NDA signed, beta kickoff call scheduled for January 28"], people: ["Swapnil"], reasons: ["Arkade Studio confirmed as first beta client"], topics: ["client", "milestone"] } },

  // ── FEBRUARY: Build Sprint ────────────────────────────────────────────────────

  // #general — Month 2
  { id: "s_gen_005", ch: C_GENERAL, slackUser: U_SUMIT, m: 2, d: 2, h: 9,
    text: "sprint 2 officially kicked off. goals for feb:\n1. full Arkade beta — they can log in, generate, export\n2. collaboration features scoped (even if not built)\n3. pricing tiers decided\n4. performance: generation under 10s for 10 slides\n\nlet's go",
    entities: { is_relevant: true, decisions: ["Sprint 2 goals: Arkade beta, collaboration scope, pricing tiers, 10-slide generation under 10 seconds"], people: ["Sumit"], reasons: ["February sprint targets shipping a working beta to Arkade Studio"], topics: ["sprint", "milestone", "product"] } },

  { id: "s_gen_006", ch: C_GENERAL, slackUser: U_SWAPNIL, m: 2, d: 14, h: 10,
    text: "BIG NEWS 🎉 Arkade Studio finished their first week with WEAVE and sent this:\n\n'The generation speed is noticeably better than Gamma. The PPT export is clean. Main ask: more templates and a way to customize brand colors globally across all slides.'\n\nthis is validation. let's prioritize the brand kit feature",
    entities: { is_relevant: true, decisions: ["Prioritize brand kit feature (global brand colors across slides) based on Arkade Studio feedback"], people: ["Swapnil"], reasons: ["Arkade Studio confirmed WEAVE is faster than Gamma, brand kit is their primary feature request"], topics: ["client", "product", "feature"] } },

  { id: "s_gen_007", ch: C_GENERAL, slackUser: U_SUMIT, m: 2, d: 28, h: 17,
    text: "shipped today:\n- brand kit feature (global colors + fonts)\n- 3 new templates (Pitch Deck, Product Update, Investor Update)\n- PDF export (was missing before)\n\nnext week: real-time collaboration scoping",
    entities: { is_relevant: true, decisions: ["Ship brand kit, 3 new templates (Pitch Deck, Product Update, Investor Update), and PDF export"], people: ["Sumit"], reasons: ["Based on Arkade Studio feedback and sprint 2 goals"], topics: ["feature", "milestone", "product"] } },

  // #weave-dev — Month 2
  { id: "s_dev_017", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 3, h: 11,
    text: "rate limiting strategy: going with a token bucket approach. each user gets 50 AI generation credits/month on free tier. tracking in postgres (not redis) for now to keep infra simple. we can add redis later if the table gets hit too hard",
    entities: { is_relevant: true, decisions: ["Implement token bucket rate limiting with 50 credits/month free tier, tracked in Postgres initially"], people: ["Sumit"], reasons: ["Simple Postgres tracking avoids Redis complexity for v1, can migrate to Redis if load demands it"], topics: ["rate-limiting", "backend", "monetization"] } },

  { id: "s_dev_018", ch: C_DEV, slackUser: U_AYUSH, m: 2, d: 3, h: 11, min: 20, threadId: "s_dev_017",
    text: "what's the UX when someone hits the limit? needs to be graceful — not just a 429 error. ideally shows remaining credits and an upgrade CTA",
    entities: { is_relevant: true, decisions: ["Rate limit UX should show remaining credits and upgrade CTA, not just return a 429 error"], people: ["Ayush"], reasons: ["Graceful rate limit UX improves conversion to paid plans"], topics: ["ux", "monetization", "frontend"] } },

  { id: "s_dev_019", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 5, h: 14,
    text: "collaboration feature scoping:\n\nreal-time (OT/CRDT) co-editing: OUT of v1. this is a month of work minimum and Arkade doesn't need it yet\nsharing via link (view-only): IN — easy win, just a signed URL with a public endpoint\nsharing with edit permission: OUT for now\ncomments/annotations: OUT for now\n\nlet's ship the link sharing and call it done for v1",
    entities: { is_relevant: true, decisions: ["Defer real-time collaboration and comment features to v2, ship view-only link sharing in v1"], people: ["Sumit"], reasons: ["Real-time co-editing is a month of work minimum, Arkade Studio doesn't need it yet, link sharing is an easy high-value win"], topics: ["product", "scope", "collaboration"] } },

  { id: "s_dev_020", ch: C_DEV, slackUser: U_SWAPNIL, m: 2, d: 5, h: 14, min: 30, threadId: "s_dev_019",
    text: "confirmed with Arkade — link sharing is all they need for now. they share decks with clients for review, not co-editing",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_021", ch: C_DEV, slackUser: U_AYUSH, m: 2, d: 8, h: 10,
    text: "animation library decision: using Framer Motion for slide transitions and micro-interactions. i tried CSS animations first but the JS-driven approach lets us do gesture-based interactions (drag to reorder, swipe between slides on mobile) which CSS can't do easily",
    entities: { is_relevant: true, decisions: ["Use Framer Motion for animations and transitions instead of pure CSS animations"], people: ["Ayush"], reasons: ["JS-driven animations enable gesture-based interactions like drag-to-reorder that CSS cannot handle"], topics: ["frontend", "animation", "tech-stack"] } },

  { id: "s_dev_022", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 10, h: 15,
    text: "pptxgenjs is working but the output is uglier than i'd like. the issue is translating our CSS-based slide layouts to pptx shapes accurately. spent 2 days on this. current solution: render slides to PNG via puppeteer and embed as full-bleed images in pptx. loses editability but looks perfect",
    entities: { is_relevant: true, decisions: ["Generate PPT slides as embedded PNG images via Puppeteer rather than native PPTX shapes for v1"], people: ["Sumit"], reasons: ["Native PPTX shape generation produces lower quality output, PNG embedding via Puppeteer matches visual design exactly"], topics: ["export", "backend", "quality"] } },

  { id: "s_dev_023", ch: C_DEV, slackUser: U_SWAPNIL, m: 2, d: 10, h: 15, min: 30, threadId: "s_dev_022",
    text: "wait — non-editable PPT could be a dealbreaker for some clients. they need to tweak slides in PowerPoint after download. can we have a 'editable (lower quality)' option alongside 'pixel perfect (image-based)'?",
    entities: { is_relevant: true, decisions: ["Offer two PPT export modes: pixel-perfect (PNG-based) and editable (native shapes, lower fidelity)"], people: ["Swapnil"], reasons: ["Some clients need to edit slides in PowerPoint after download, not just view them"], topics: ["product", "export", "feature"] } },

  { id: "s_dev_024", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 11, h: 9, threadId: "s_dev_022",
    text: "fair point. ok plan: ship PNG-based export for beta (pixel-perfect), add native shapes export as a v1.1 feature. will put it in the backlog",
    entities: { is_relevant: true, decisions: ["Ship PNG-based PPT export for beta, defer native shapes export to v1.1"], people: ["Sumit"], reasons: ["PNG-based export can ship now while native shapes requires more development time"], topics: ["export", "scope", "product"] } },

  { id: "s_dev_025", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 17, h: 11,
    text: "performance issue found: generating a 10-slide deck is hitting 18-22s, way over our 10s target. root cause: we're making sequential GPT-4o calls, not parallel. switching to Promise.all() across slide generation. this should drop it to ~4-6s",
    entities: { is_relevant: true, decisions: ["Switch AI slide generation from sequential to parallel using Promise.all to reduce latency from 18-22s to 4-6s"], people: ["Sumit"], reasons: ["Sequential GPT-4o calls were the bottleneck, parallel calls are safe since slides are independent"], topics: ["performance", "ai-pipeline", "backend"] } },

  { id: "s_dev_026", ch: C_DEV, slackUser: U_AYUSH, m: 2, d: 17, h: 11, min: 20, threadId: "s_dev_025",
    text: "🙌 huge win. one thing to watch: GPT-4o rate limits. if we fire 10 requests simultaneously per user and we have 100 concurrent users that's 1000 req/min. need to confirm our openai tier supports that",
    entities: { is_relevant: true, decisions: ["Monitor OpenAI rate limits when scaling parallel slide generation to multiple concurrent users"], people: ["Ayush"], reasons: ["1000 req/min possible at 100 concurrent users, must confirm OpenAI tier supports this"], topics: ["performance", "infra", "scaling"] } },

  { id: "s_dev_027", ch: C_DEV, slackUser: U_SUMIT, m: 2, d: 20, h: 14,
    text: "file storage for user-uploaded brand assets (logos, fonts): using Cloudflare R2. same S3 API but 0 egress fees. this matters when clients are downloading exported decks frequently",
    entities: { is_relevant: true, decisions: ["Use Cloudflare R2 for file storage instead of AWS S3"], people: ["Sumit"], reasons: ["R2 has zero egress fees which significantly reduces costs for frequent deck downloads"], topics: ["storage", "infra", "cost"] } },

  // #design — Month 2
  { id: "s_dsn_006", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 2, d: 4, h: 10,
    text: "first Arkade deck review:\n\npositive: generation quality is good, they love the speed\nnegative: the default font sizes on slides feel small. on a projector, the body text at 16px equivalent is unreadable past 5m. need bigger defaults for slide body text",
    entities: { is_relevant: true, decisions: ["Increase default slide body text size — current 16px equivalent is too small for projector viewing"], people: ["Swapnil"], reasons: ["Arkade Studio user feedback: body text is unreadable past 5m on a projector"], topics: ["design", "typography", "client-feedback"] } },

  { id: "s_dsn_007", ch: C_DESIGN, slackUser: U_AYUSH, m: 2, d: 4, h: 10, min: 30, threadId: "s_dsn_006",
    text: "fixing that today. setting new defaults: title 44px, subtitle 28px, body 22px, caption 16px. these match industry standard presentation typography",
    entities: { is_relevant: true, decisions: ["Set slide typography defaults: title 44px, subtitle 28px, body 22px, caption 16px"], people: ["Ayush"], reasons: ["Industry standard presentation typography, fixes Arkade Studio's projector readability concern"], topics: ["typography", "design", "ux"] } },

  { id: "s_dsn_008", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 2, d: 11, h: 11,
    text: "brand kit UI mockup is in Figma (link in pins). key decisions:\n1. global color palette (primary, secondary, accent, bg, text)\n2. font pairing (heading + body)\n3. logo upload\n4. auto-apply across all slides on save\n\nayush can you review for feasibility?",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dsn_009", ch: C_DESIGN, slackUser: U_AYUSH, m: 2, d: 11, h: 14,
    text: "reviewed the brand kit mockup. the 'auto-apply across all slides' part is the tricky bit — it's basically a CSS variable override at the presentation level. feasible, will take 2 days. the font upload is harder — need to use @font-face injection at runtime. let's scope custom fonts to v2 and do brand colors + logo for v1",
    entities: { is_relevant: true, decisions: ["Ship brand kit v1 with brand colors and logo only, defer custom font upload to v2"], people: ["Ayush"], reasons: ["Custom font upload requires runtime @font-face injection which is complex, brand colors alone cover 80% of the value"], topics: ["design", "brand-kit", "scope"] } },

  { id: "s_dsn_010", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 2, d: 12, h: 9, threadId: "s_dsn_009",
    text: "confirmed with Arkade — colors + logo is what they really need. fonts are secondary. go ahead",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dsn_011", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 2, d: 24, h: 14,
    text: "NovaBrands reached out — they're a brand agency that creates presentation decks for enterprise clients. interested in WEAVE. swapnil's call with them tomorrow. if they sign, this is our second client with a very different use case to Arkade (enterprise vs startup)",
    entities: { is_relevant: true, decisions: ["Pursue NovaBrands as second client (enterprise brand agency use case)"], people: ["Swapnil"], reasons: ["NovaBrands represents enterprise segment, validates WEAVE's appeal beyond startup/agency market"], topics: ["client", "sales", "product"] } },

  // #product — Month 2
  { id: "s_prd_006", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 2, d: 7, h: 10,
    text: "pricing model decision time. options:\n\nFREEMIUM: free tier (limited generations), paid for more\nPER-SEAT: monthly per user\nUSAGE-BASED: per generation/export\n\nmy vote: Freemium. lower friction for acquisition. competition uses per-seat (Gamma is $10/user/mo). we can charge $8/user/mo for Pro. makes us slightly cheaper with a real free tier",
    entities: { is_relevant: true, decisions: ["Use freemium pricing model at $8/user/month for Pro tier"], people: ["Swapnil"], reasons: ["Lower acquisition friction than per-seat, underprice Gamma ($10/user/mo) while offering real free tier"], topics: ["pricing", "monetization", "product"] } },

  { id: "s_prd_007", ch: C_PRODUCT, slackUser: U_SUMIT, m: 2, d: 7, h: 10, min: 30, threadId: "s_prd_006",
    text: "agree on freemium. what's the free tier limit? i'd say 10 generations/month and max 3 saved presentations. paid tier: unlimited generations, unlimited saves, brand kit, team sharing",
    entities: { is_relevant: true, decisions: ["Free tier: 10 generations/month, 3 saved presentations. Pro tier: unlimited generations, unlimited saves, brand kit, team sharing"], people: ["Sumit"], reasons: ["Generous enough free tier to drive word-of-mouth, Pro features are table stakes for professional use"], topics: ["pricing", "product", "monetization"] } },

  { id: "s_prd_008", ch: C_PRODUCT, slackUser: U_AYUSH, m: 2, d: 7, h: 11, threadId: "s_prd_006",
    text: "one thing: 'unlimited generations' is scary from a cost perspective. GPT-4o is not free. do we need a soft cap even on Pro? or absorb the cost and price it in?",
    entities: { is_relevant: true, decisions: ["Absorb AI generation cost in Pro plan pricing at $8/user/month, monitor cost/user metric"], people: ["Ayush"], reasons: ["Unlimited generations is a key differentiator but must be monitored for cost sustainability"], topics: ["pricing", "cost", "backend"] } },

  { id: "s_prd_009", ch: C_PRODUCT, slackUser: U_SUMIT, m: 2, d: 7, h: 11, min: 30, threadId: "s_prd_006",
    text: "avg 10-slide deck = ~$0.04 in GPT-4o costs. if a Pro user generates 50 decks/month = $2 cost. at $8/mo that's fine. if they generate 200 decks/month... we have a business problem anyway. let's monitor cost/user monthly and revisit if avg > $3/user",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_prd_010", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 2, d: 21, h: 11,
    text: "NovaBrands call done. they want:\n1. white-labeling (WEAVE logo removed, their logo in app)\n2. custom domain support\n3. SSO via their Okta\n4. dedicated account manager\n\nthis is Enterprise territory. we don't have any of this. but the contract size would be significant. i say we quote them an Enterprise tier and figure out the timeline",
    entities: { is_relevant: true, decisions: ["Create Enterprise pricing tier with white-labeling, custom domain, SSO, and dedicated account management"], people: ["Swapnil"], reasons: ["NovaBrands requirements exceed Pro tier, enterprise contract size justifies building these features"], topics: ["client", "enterprise", "product", "pricing"] } },

  { id: "s_prd_011", ch: C_PRODUCT, slackUser: U_SUMIT, m: 2, d: 21, h: 11, min: 30, threadId: "s_prd_010",
    text: "white-labeling and custom domain: doable in 2-3 weeks. Okta SSO: more complex, need to support SAML. dedicated account manager: that's just Swapnil for now. let's quote them a 3-month pilot at a fixed price rather than per-seat",
    entities: { is_relevant: true, decisions: ["Quote NovaBrands a 3-month Enterprise pilot at fixed price rather than per-seat"], people: ["Sumit"], reasons: ["Fixed pilot reduces NovaBrands risk and gives Farship time to build enterprise features without long-term commitment"], topics: ["sales", "enterprise", "pricing"] } },

  // #standup — Month 2
  { id: "s_std_010", ch: C_STANDUP, slackUser: U_SUMIT, m: 2, d: 3, h: 9,
    text: "standup Feb 3:\n✅ yesterday: parallel slide gen shipped, 10-slide deck now at 5.2s avg ✅\n🔨 today: rate limiting implementation\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_011", ch: C_STANDUP, slackUser: U_AYUSH, m: 2, d: 3, h: 9, min: 10,
    text: "standup Feb 3:\n✅ yesterday: SSE streaming frontend integration, progress bar for generation\n🔨 today: brand kit UI components\n❌ blockers: Sumit — need the API shape for brand kit endpoint",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_012", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 2, d: 3, h: 9, min: 20,
    text: "standup Feb 3:\n✅ yesterday: Arkade beta kickoff call, they're live with WEAVE!\n🔨 today: writing user stories for brand kit based on Arkade feedback\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_013", ch: C_STANDUP, slackUser: U_SUMIT, m: 2, d: 17, h: 9,
    text: "standup Feb 17:\n✅ yesterday: brand kit backend done, colors apply across all slides\n🔨 today: PPT export quality testing with Arkade's actual decks\n❌ blockers: Puppeteer is slow on Railway — 800ms per slide render. 10 slides = 8s just for export. investigating",
    entities: { is_relevant: true, decisions: ["Investigate Puppeteer performance on Railway, 800ms per slide is too slow for PPT export"], people: ["Sumit"], reasons: ["10-slide export at 800ms/slide = 8s total, unacceptable UX"], topics: ["performance", "export", "infra"] } },

  { id: "s_std_014", ch: C_STANDUP, slackUser: U_AYUSH, m: 2, d: 17, h: 9, min: 10,
    text: "standup Feb 17:\n✅ yesterday: brand kit UI shipped, Arkade team is testing\n🔨 today: mobile responsiveness pass on the editor\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_015", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 2, d: 17, h: 9, min: 20,
    text: "standup Feb 17:\n✅ yesterday: NovaBrands pilot proposal sent, awaiting response\n🔨 today: template design for 3 new templates (sumit mentioned shipping these)\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── MARCH: Polish & Launch ────────────────────────────────────────────────────

  // #general — Month 3
  { id: "s_gen_008", ch: C_GENERAL, slackUser: U_SWAPNIL, m: 3, d: 5, h: 10,
    text: "🎊 NovaBrands signed! 3-month enterprise pilot starting March 10. this is huge for us — validates the enterprise angle. they have 12 users on the pilot. sumit let's sync on the white-labeling timeline this week",
    entities: { is_relevant: true, decisions: ["NovaBrands Enterprise pilot signed, starting March 10, 12 users"], people: ["Swapnil"], reasons: ["Enterprise pilot validates WEAVE for agency/enterprise segment"], topics: ["client", "milestone", "enterprise"] } },

  { id: "s_gen_009", ch: C_GENERAL, slackUser: U_SUMIT, m: 3, d: 15, h: 16,
    text: "feature freeze for WEAVE v1.0:\n\nIN: everything already built + SAML SSO (for NovaBrands)\nOUT: real-time collaboration, AI image generation, GitHub import, Notion import\n\nwe ship v1.0 on March 31. no more scope creep",
    entities: { is_relevant: true, decisions: ["WEAVE v1.0 feature freeze: ship SAML SSO, cut real-time collaboration, AI image generation, GitHub and Notion imports"], people: ["Sumit"], reasons: ["March 31 ship date requires scope discipline, deferred features are v2 roadmap"], topics: ["product", "scope", "milestone"] } },

  { id: "s_gen_010", ch: C_GENERAL, slackUser: U_AYUSH, m: 3, d: 15, h: 16, min: 15, threadId: "s_gen_009",
    text: "finally 🙏 the collaboration scope creep was killing us. agreed",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_gen_011", ch: C_GENERAL, slackUser: U_SUMIT, m: 3, d: 31, h: 18,
    text: "WEAVE v1.0 is live 🚀\n\nhttps://weave.farship.io\n\ncurrent state:\n- 2 paying clients (Arkade Studio + NovaBrands Enterprise)\n- Avg generation time: 5.8s for 10 slides\n- PPT + PDF export\n- Brand kit\n- Share links\n- SAML SSO for NovaBrands\n\nthanks team. sprint 4 planning Monday",
    entities: { is_relevant: true, decisions: ["WEAVE v1.0 launched on March 31 with 2 clients, 5.8s avg generation, PPT/PDF export, brand kit, and SAML SSO"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["Sprint 4 starts Monday with v2 roadmap"], topics: ["milestone", "launch", "product"] } },

  // #weave-dev — Month 3
  { id: "s_dev_028", ch: C_DEV, slackUser: U_SUMIT, m: 3, d: 2, h: 11,
    text: "Puppeteer perf fix: moved slide rendering to a dedicated Lambda function (AWS Lambda) instead of doing it inline on Railway. cold start is 800ms but it runs isolated and parallelizes perfectly. export time for 10 slides: 3.2s now",
    entities: { is_relevant: true, decisions: ["Move Puppeteer slide rendering to AWS Lambda instead of Railway for PPT export"], people: ["Sumit"], reasons: ["Lambda isolates rendering, runs in parallel, reduces 10-slide export from 8s to 3.2s"], topics: ["performance", "infra", "export"] } },

  { id: "s_dev_029", ch: C_DEV, slackUser: U_AYUSH, m: 3, d: 2, h: 11, min: 30, threadId: "s_dev_028",
    text: "nice. does this add cost? lambda compute for rendering isn't free",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_030", ch: C_DEV, slackUser: U_SUMIT, m: 3, d: 2, h: 12, threadId: "s_dev_028",
    text: "at our current scale ~$2-3/month. negligible. will reassess at 1000+ exports/day",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dev_031", ch: C_DEV, slackUser: U_SUMIT, m: 3, d: 7, h: 14,
    text: "SAML SSO implementation:\n\nusing passport-saml library. NovaBrands uses Okta. i've set up the SP metadata endpoint and tested the SAML assertion flow. it works but the SP metadata format Okta expects is finicky. spent 2 days on this. worth it — it's now a reusable SSO module",
    entities: { is_relevant: true, decisions: ["Implement SAML SSO using passport-saml library, tested with Okta for NovaBrands"], people: ["Sumit"], reasons: ["NovaBrands requires SSO, reusable module enables future enterprise clients"], topics: ["auth", "enterprise", "backend"] } },

  { id: "s_dev_032", ch: C_DEV, slackUser: U_AYUSH, m: 3, d: 10, h: 10,
    text: "accessibility audit done (using axe DevTools). main issues found:\n1. slide canvas keyboard navigation missing\n2. color contrast on Ocean theme body text fails WCAG AA\n3. drag-to-reorder has no keyboard alternative\n\nfixing 1 and 2 this week. 3 is deferred — complex to implement properly",
    entities: { is_relevant: true, decisions: ["Fix slide canvas keyboard navigation and Ocean theme color contrast before v1.0, defer keyboard drag-to-reorder"], people: ["Ayush"], reasons: ["WCAG AA compliance required, Ocean theme fails contrast ratio, drag keyboard fallback is complex"], topics: ["accessibility", "frontend", "quality"] } },

  { id: "s_dev_033", ch: C_DEV, slackUser: U_SUMIT, m: 3, d: 18, h: 11,
    text: "monitoring setup: using Sentry for error tracking and Axiom for logs. added a /health endpoint that Railway monitors. set up alerts for:\n- p95 generation latency > 15s\n- error rate > 2%\n- DB connection failures\n\nShould give us enough visibility for launch",
    entities: { is_relevant: true, decisions: ["Use Sentry for error tracking and Axiom for logs, alert on p95 latency > 15s and error rate > 2%"], people: ["Sumit"], reasons: ["Need observability before v1.0 launch to catch issues quickly"], topics: ["monitoring", "infra", "devops"] } },

  { id: "s_dev_034", ch: C_DEV, slackUser: U_SUMIT, m: 3, d: 25, h: 15,
    text: "db indexes review before launch:\n\nadded composite indexes on:\n- presentations(user_id, created_at) — for user dashboard query\n- generations(presentation_id, created_at) — for history\n- exports(user_id, created_at) — for billing reports\n\nwithout these the dashboard query was doing sequential scans. now < 5ms",
    entities: { is_relevant: true, decisions: ["Add composite DB indexes on presentations, generations, and exports tables before launch"], people: ["Sumit"], reasons: ["Dashboard query was doing sequential scans, composite indexes reduce query time to under 5ms"], topics: ["database", "performance", "backend"] } },

  // #product — Month 3
  { id: "s_prd_012", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 3, d: 3, h: 11,
    text: "NovaBrands onboarding call: their main use case is generating quarterly business review decks for 5-8 enterprise clients. avg deck: 25-35 slides. that's 3x our typical Arkade use case. need to make sure our generation handles 30-slide decks cleanly",
    entities: { is_relevant: true, decisions: ["Ensure WEAVE handles 30-slide deck generation for NovaBrands enterprise use case"], people: ["Swapnil"], reasons: ["NovaBrands generates 25-35 slide QBR decks, 3x the typical Arkade use case"], topics: ["client", "performance", "product"] } },

  { id: "s_prd_013", ch: C_PRODUCT, slackUser: U_SUMIT, m: 3, d: 3, h: 11, min: 30, threadId: "s_prd_012",
    text: "tested 30-slide generation. works, takes 8s with parallel calls. main concern: OpenAI context window — a 30-slide outline is ~3000 tokens. fine, but a 50-slide deck would get close to limits. 30 slides is our max per deck for now",
    entities: { is_relevant: true, decisions: ["Set 30 slides as maximum deck size for v1.0 due to OpenAI context window constraints"], people: ["Sumit"], reasons: ["30-slide outline is ~3000 tokens (fine), 50-slide deck approaches context limits"], topics: ["product", "ai-pipeline", "constraint"] } },

  { id: "s_prd_014", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 3, d: 12, h: 14,
    text: "NovaBrands first week feedback:\n- very positive on generation quality\n- want: speaker notes longer and more detailed\n- want: 'executive summary' slide auto-generated at the start\n- struggling with: the theme customization is not flexible enough for their client brand standards\n\nnote the brand customization gap — this is going on the v2 roadmap as high priority",
    entities: { is_relevant: true, decisions: ["Extend speaker notes length and add auto-generated executive summary slide, add advanced brand customization to v2 roadmap"], people: ["Swapnil"], reasons: ["NovaBrands first-week feedback highlights speaker notes depth and brand flexibility as key gaps"], topics: ["client-feedback", "product", "roadmap"] } },

  { id: "s_prd_015", ch: C_PRODUCT, slackUser: U_SWAPNIL, m: 3, d: 20, h: 10,
    text: "third inbound this week — TechFlow, a SaaS startup, found us through Arkade's recommendation. they want a demo. ayush can you make sure the public-facing landing page is sharp before Friday?",
    entities: { is_relevant: true, decisions: ["Schedule TechFlow demo by Friday, polish landing page before the call"], people: ["Swapnil", "Ayush"], reasons: ["TechFlow came via Arkade referral, proof-of-concept for word-of-mouth growth"], topics: ["sales", "client", "growth"] } },

  // #design — Month 3
  { id: "s_dsn_012", ch: C_DESIGN, slackUser: U_AYUSH, m: 3, d: 4, h: 11,
    text: "landing page redesign plan: i want to show WEAVE actually generating a deck in real-time on the hero. not a static screenshot, not a video — a live demo embedded in the page. users can type a topic and see a 3-slide deck generated. best conversion driver for a tool like this",
    entities: { is_relevant: true, decisions: ["Embed live WEAVE demo on landing page hero (type a topic, see 3 slides generate in real-time) instead of static screenshots"], people: ["Ayush"], reasons: ["Interactive live demo is the strongest conversion driver for an AI generation tool"], topics: ["marketing", "landing-page", "design"] } },

  { id: "s_dsn_013", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 3, d: 4, h: 11, min: 20, threadId: "s_dsn_012",
    text: "yes, this is great. Gamma does this. users who interact with the hero demo have 4x higher conversion. let's do it",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_dsn_014", ch: C_DESIGN, slackUser: U_SWAPNIL, m: 3, d: 22, h: 14,
    text: "final template review before launch — we have 9 templates:\n1. Startup Pitch\n2. Product Update\n3. Investor Update\n4. Sales Deck\n5. QBR (quarterly business review)\n6. Team Standup\n7. Workshop / Training\n8. Case Study\n9. Company Overview\n\nthis feels right for launch. covers 90% of our target users' use cases",
    entities: { is_relevant: true, decisions: ["Launch WEAVE v1.0 with 9 templates covering startup, enterprise, and agency use cases"], people: ["Swapnil"], reasons: ["9 templates cover 90% of target user use cases across startup, enterprise, and agency segments"], topics: ["templates", "design", "product", "launch"] } },

  // #standup — Month 3
  { id: "s_std_016", ch: C_STANDUP, slackUser: U_SUMIT, m: 3, d: 3, h: 9,
    text: "standup Mar 3:\n✅ yesterday: Lambda puppeteer export working, 10-slide export now 3.2s\n🔨 today: SAML SSO for NovaBrands, white-labeling domain config\n❌ blockers: AWS Lambda cold start is 800ms — acceptable but monitoring",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_017", ch: C_STANDUP, slackUser: U_AYUSH, m: 3, d: 3, h: 9, min: 10,
    text: "standup Mar 3:\n✅ yesterday: PDF export bug fix (fonts weren't embedding), accessibility audit started\n🔨 today: landing page redesign kickoff, live demo component\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_018", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 3, d: 3, h: 9, min: 20,
    text: "standup Mar 3:\n✅ yesterday: NovaBrands onboarding call, requirements captured\n🔨 today: writing Enterprise SLA doc + support process\n❌ blockers: need white-labeling timeline from Sumit for NovaBrands kickoff",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_019", ch: C_STANDUP, slackUser: U_SUMIT, m: 3, d: 17, h: 9,
    text: "standup Mar 17:\n✅ yesterday: SSO live for NovaBrands, white-labeling (custom logo) done\n🔨 today: DB indexes, monitoring setup, pre-launch checklist\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_020", ch: C_STANDUP, slackUser: U_AYUSH, m: 3, d: 17, h: 9, min: 10,
    text: "standup Mar 17:\n✅ yesterday: live hero demo on landing page shipped, looks great\n🔨 today: last accessibility fixes, mobile polish\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_021", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 3, d: 17, h: 9, min: 20,
    text: "standup Mar 17:\n✅ yesterday: TechFlow demo scheduled for Friday, 9 templates final review done\n🔨 today: launch blog post draft\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_022", ch: C_STANDUP, slackUser: U_SUMIT, m: 3, d: 24, h: 9,
    text: "standup Mar 24:\n✅ yesterday: all launch checklist items done, staging is clean\n🔨 today: production deploy dry run, DNS verification\n❌ blockers: none — we're launching Friday",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_023", ch: C_STANDUP, slackUser: U_AYUSH, m: 3, d: 24, h: 9, min: 10,
    text: "standup Mar 24:\n✅ yesterday: Lighthouse score 98 on landing page, WCAG AA passed\n🔨 today: final smoke test on production build\n❌ blockers: none",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "s_std_024", ch: C_STANDUP, slackUser: U_SWAPNIL, m: 3, d: 24, h: 9, min: 20,
    text: "standup Mar 24:\n✅ yesterday: TechFlow demo went well, they're very interested in monthly plan\n🔨 today: TechFlow proposal + launch tweet draft\n❌ blockers: none — ready to ship 🚀",
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },
];

// ── Gmail Data ─────────────────────────────────────────────────────────────────
export interface GmailSeed {
  id: string; threadId: string; subject: string;
  from: string; to: string; m: number; d: number; h?: number;
  snippet: string; body: string; labels: string[];
  entities: SeedEntities;
}

export const GMAIL_MESSAGES: GmailSeed[] = [
  // ── Thread 1: Arkade Studio onboarding (6 emails) ────────────────────────────
  { id: "gm_ark_001", threadId: "gth_ark_001", m: 1, d: 22, h: 10,
    subject: "WEAVE Beta Access — Welcome Arkade Studio",
    from: "sumit@farship.io", to: "rohan@arkadestudio.in",
    snippet: "Hi Rohan, excited to get Arkade started on WEAVE beta...",
    body: `Hi Rohan,

Excited to get Arkade Studio started on the WEAVE beta! I've set up your account at app.weave.farship.io — login with your Google account (rohan@arkadestudio.in).

A few things to know for the beta:
- Generation: up to 15 slides per deck, 50 decks/month for your team
- Export: PPT (image-based, pixel-perfect) and PDF both work
- Brand kit: you can upload your logo and set brand colors in Settings
- Feedback: drop anything in the #arkade-feedback Slack channel we set up for you

We'd love a short call at the end of week 2 to hear your thoughts. Happy to schedule via Calendly.

Thanks for being our first beta partner. Let's build something great.

Sumit
Farship`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Onboard Arkade Studio to WEAVE beta with 50 decks/month limit"], people: ["Sumit", "Rohan"], reasons: ["Arkade Studio is the first beta client"], topics: ["client", "onboarding"] } },

  { id: "gm_ark_002", threadId: "gth_ark_001", m: 1, d: 23, h: 14,
    subject: "Re: WEAVE Beta Access — Welcome Arkade Studio",
    from: "rohan@arkadestudio.in", to: "sumit@farship.io",
    snippet: "Thanks Sumit! Logged in and already generated two decks...",
    body: `Hi Sumit,

Thanks! Logged in and already generated two decks — one for a D2C skincare pitch and one for a SaaS company we're working with.

First impressions:
1. The generation speed is noticeably better than Gamma. First slide appeared in under 2 seconds.
2. The PPT export is clean — the formatting held up perfectly in PowerPoint. This was our biggest pain point with Gamma.
3. The content quality is solid for a first pass. We usually need to tweak 30-40% of Gamma output, this is more like 15-20%.

One ask: can we get more templates? Right now we're working from the generic one and it feels basic. Would love a proper 'Pitch Deck' and 'Product Demo' template.

Will report back after the full team uses it next week.

Rohan
Arkade Studio`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Prioritize adding Pitch Deck and Product Demo templates based on Arkade feedback"], people: ["Rohan", "Sumit"], reasons: ["Arkade found generation 50% better than Gamma but needs more templates for professional use"], topics: ["client-feedback", "product", "templates"] } },

  { id: "gm_ark_003", threadId: "gth_ark_001", m: 2, d: 5, h: 11,
    subject: "Re: WEAVE Beta Access — Feature request: Brand Kit",
    from: "rohan@arkadestudio.in", to: "sumit@farship.io",
    snippet: "Quick update from the Arkade team after week 2...",
    body: `Hi Sumit,

Quick update from the Arkade team after week 2 of using WEAVE:

The team is getting used to it and the feedback is mostly positive. Generation quality is good.

Main pain point: we're generating decks for 4-5 different clients and each has their own brand colors, logo, and font preferences. Right now we have to manually edit every slide after export to apply brand colors. This is the most time-consuming part of our workflow.

If you could build a way to save brand presets per client (logo + colors), that would be a game-changer for us. Even better if it applies automatically when generating.

Also: the body text font size feels small on a projector. Not sure if this is a WEAVE issue or just the default but could you look into it?

Thanks
Rohan`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Build brand kit with per-client presets (logo, colors) as high-priority feature"], people: ["Rohan"], reasons: ["Arkade manually edits brand colors for each of 4-5 clients after every export, major workflow bottleneck"], topics: ["feature-request", "brand-kit", "client-feedback"] } },

  { id: "gm_ark_004", threadId: "gth_ark_001", m: 2, d: 6, h: 9,
    subject: "Re: WEAVE Beta Access — Brand Kit coming + font fix",
    from: "sumit@farship.io", to: "rohan@arkadestudio.in",
    snippet: "Thanks Rohan, great feedback. Brand kit is now our top priority...",
    body: `Hi Rohan,

Thanks for the detailed feedback — this is exactly the kind of input that shapes what we build.

On brand kit: this is now our #1 priority for the sprint. We're targeting shipping it by Feb 14. It will include:
- Logo upload (PNG/SVG, auto-placed on all slides)
- Brand color palette (primary, secondary, accent, background, text)
- Auto-applied when generating a new deck

We'll add per-client brand presets as a follow-up (save multiple kits, switch between them).

On font size: fixed! New defaults are title 44px, body 22px, caption 16px. Deploying today. Let me know if that's better.

More templates (Pitch Deck, Product Demo, Investor Update) shipping this week too.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "gm_ark_005", threadId: "gth_ark_001", m: 2, d: 21, h: 16,
    subject: "Re: WEAVE Beta Access — Brand Kit shipped",
    from: "rohan@arkadestudio.in", to: "sumit@farship.io",
    snippet: "The brand kit is amazing! We've set up kits for all 4 of our main clients...",
    body: `Hi Sumit,

The brand kit feature is amazing. We've set up brand kits for all 4 of our main clients now. The auto-apply on generation saves us about 45 minutes per deck — which is significant when we're making 3-5 decks a week.

The new templates are also great. The Pitch Deck template is exactly what we needed — the structure is spot on for D2C startup pitches.

Two small issues:
1. When we switch themes, the brand colors sometimes get overridden by the theme's defaults. Should probably respect the brand kit even when theme changes.
2. The shared link doesn't show the brand logo in the preview — it shows the WEAVE logo instead.

Overall, the product has come a long way in just 3 weeks. Really happy with the progress.

Rohan`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Fix: brand kit colors must not be overridden by theme changes; fix: share link preview should show client logo not WEAVE logo"], people: ["Rohan"], reasons: ["Brand consistency is critical for agency use — theme switches breaking brand colors is a significant bug"], topics: ["bug", "brand-kit", "client-feedback"] } },

  { id: "gm_ark_006", threadId: "gth_ark_001", m: 3, d: 3, h: 10,
    subject: "Re: WEAVE Beta Access — Moving to Pro plan",
    from: "rohan@arkadestudio.in", to: "swapnil@farship.io",
    snippet: "Hey Swapnil, we want to move from beta to the Pro plan...",
    body: `Hey Swapnil,

We want to move from beta to the Pro plan. The product has been solid and the team is using it daily now. We've replaced Gamma + Figma with WEAVE for almost all our deck work.

A few questions:
1. Pro plan — $8/user/month, right? We have 4 people who use WEAVE. So $32/month total?
2. Can we pay annually? Would prefer that from a budgeting perspective.
3. Is there a way to get priority support? Not a dealbreaker but would be nice.

Let me know the process to upgrade.

Rohan`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Arkade Studio converting from beta to Pro plan, 4 seats at $8/user/month"], people: ["Rohan", "Swapnil"], reasons: ["Arkade has replaced Gamma + Figma workflow entirely with WEAVE"], topics: ["client", "revenue", "pro-plan"] } },

  // ── Thread 2: NovaBrands Enterprise (5 emails) ────────────────────────────────
  { id: "gm_nova_001", threadId: "gth_nova_001", m: 2, d: 25, h: 14,
    subject: "WEAVE Enterprise Inquiry — NovaBrands",
    from: "priya.kapoor@novabrands.com", to: "swapnil@farship.io",
    snippet: "Hi Swapnil, following our call today about WEAVE for our agency...",
    body: `Hi Swapnil,

Following our call today — thanks for walking me through WEAVE. I can definitely see the value for our use case.

To recap what we need for the enterprise pilot:
1. White-labeling: remove WEAVE branding, add NovaBrands logo in the app
2. Custom domain: presentations.novabrands.com
3. SSO via Okta (SAML 2.0)
4. At least 12 user seats for the pilot
5. Dedicated point of contact for support

Our typical deck is 25-35 slides for quarterly business reviews. We need to confirm WEAVE handles this volume reliably.

Please send over the Enterprise pilot pricing and timeline.

Thanks
Priya Kapoor
Head of Digital Delivery, NovaBrands`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["NovaBrands enterprise requirements: white-labeling, custom domain, Okta SAML SSO, 12 seats"], people: ["Priya Kapoor", "Swapnil"], reasons: ["NovaBrands is a brand agency creating QBR decks for enterprise clients, needs enterprise-grade features"], topics: ["enterprise", "client", "requirements"] } },

  { id: "gm_nova_002", threadId: "gth_nova_001", m: 2, d: 26, h: 10,
    subject: "Re: WEAVE Enterprise Inquiry — Pilot Proposal",
    from: "swapnil@farship.io", to: "priya.kapoor@novabrands.com",
    snippet: "Hi Priya, great speaking with you. Here's our Enterprise pilot proposal...",
    body: `Hi Priya,

Great speaking with you. Here's our Enterprise pilot proposal:

WEAVE Enterprise Pilot — 3 months
- 12 user seats
- White-label (WEAVE branding removed, NovaBrands logo)
- Custom domain: presentations.novabrands.com
- SAML 2.0 SSO via Okta
- Priority support (4-hour response SLA during business hours)
- Dedicated setup and onboarding call

Pricing: ₹2,40,000 for 3 months (fixed, not per-seat)
After pilot: standard Enterprise pricing at ₹12,000/seat/year

Timeline:
- Contract signing: by March 1
- SSO + white-label setup: March 7
- Full team onboarding: March 10

Can we schedule a contract review call for Monday?

Swapnil
Co-founder, Farship`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["NovaBrands Enterprise pilot: 3 months fixed at ₹2.4L, 12 seats, white-label + SSO + custom domain"], people: ["Swapnil", "Priya Kapoor"], reasons: ["Fixed pilot reduces NovaBrands risk while Farship builds enterprise features"], topics: ["enterprise", "pricing", "contract"] } },

  { id: "gm_nova_003", threadId: "gth_nova_001", m: 3, d: 1, h: 15,
    subject: "Re: WEAVE Enterprise Inquiry — Contract Signed",
    from: "priya.kapoor@novabrands.com", to: "swapnil@farship.io",
    snippet: "Hi Swapnil, we've signed and sent over the contract...",
    body: `Hi Swapnil,

We've signed the contract and sent it over via DocuSign. Payment will be processed today via NEFT.

Quick note on onboarding priorities:
1. SSO must be ready before any team member starts using the tool — we have a strict policy on non-SSO logins
2. The custom domain needs an SSL certificate (we'll provide our wildcard cert details)
3. Please ensure WEAVE handles 30-slide decks without issues — our QBR template is 28 slides

Looking forward to the setup call Wednesday.

Priya`,
    labels: ["INBOX"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "gm_nova_004", threadId: "gth_nova_001", m: 3, d: 14, h: 11,
    subject: "NovaBrands Week 1 Feedback",
    from: "priya.kapoor@novabrands.com", to: "swapnil@farship.io",
    snippet: "Hi Swapnil, week 1 with WEAVE for the full NovaBrands team...",
    body: `Hi Swapnil,

Week 1 with WEAVE for the full NovaBrands team. Here's what we've heard:

Positives:
- Generation quality is impressive, especially for structured content like QBRs
- The white-labeling is seamless — team doesn't even know it's WEAVE underneath
- SSO working perfectly via Okta

Areas to improve:
1. Speaker notes: they're too short and generic. Our QBR decks need detailed speaker notes (3-4 sentences per slide) for presenters who are briefed, not the authors.
2. Executive summary: our QBR template always starts with a 1-page exec summary. Can WEAVE auto-generate this based on the rest of the deck?
3. Brand flexibility: we work with clients who have very strict brand guidelines. The theme system doesn't let us set custom heading fonts — only colors. This is a problem for several of our clients.

Overall the team is happy and productivity is up. But these 3 items would make it truly enterprise-ready.

Priya`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Add to v2 roadmap: detailed speaker notes (3-4 sentences), auto-generated executive summary, custom heading fonts in brand kit"], people: ["Priya Kapoor"], reasons: ["NovaBrands enterprise clients have strict brand and presentation standards that current features don't fully support"], topics: ["client-feedback", "enterprise", "roadmap", "v2"] } },

  { id: "gm_nova_005", threadId: "gth_nova_001", m: 3, d: 15, h: 14,
    subject: "Re: NovaBrands Week 1 Feedback — Response",
    from: "swapnil@farship.io", to: "priya.kapoor@novabrands.com",
    snippet: "Hi Priya, thanks for the detailed feedback...",
    body: `Hi Priya,

Thanks for the detailed feedback — exactly what we need.

Here's where we stand on each item:

1. Speaker notes length: we can add a setting to configure speaker notes depth (brief / standard / detailed). Shipping in 2 weeks.

2. Executive summary: this is a great idea. We'll add it as an optional first slide type in the generation prompt. Adding to current sprint.

3. Custom heading fonts: this requires runtime font loading (not trivial). We're targeting this for our v2 release (mid-Q2). For now, the 4 heading font options in themes should cover most brand cases — can we try matching your clients' fonts to those options?

We're committed to making this work for NovaBrands. The feedback you've shared is shaping our roadmap directly.

Swapnil`,
    labels: ["SENT"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── Thread 3: AI Model Choice debate (5 emails) ───────────────────────────────
  { id: "gm_ai_001", threadId: "gth_ai_001", m: 1, d: 8, h: 11,
    subject: "AI Model Decision for WEAVE — Summary",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "Hey both, documenting our AI model decision after the evaluation...",
    body: `Hey both,

Documenting our AI model decision after this week's evaluation so we have a record.

We tested 4 models for WEAVE's core slide generation:

1. GPT-4o (OpenAI)
   - Structured JSON output: excellent (rarely hallucinates format)
   - Content quality: very good for business content
   - Speed: ~1.8s/slide
   - Cost: $0.005/1k output tokens
   - Verdict: PRIMARY ✅

2. Claude 3.5 Sonnet (Anthropic)
   - Structured JSON output: good but occasionally adds commentary outside JSON
   - Content quality: excellent prose, better than GPT-4o for narrative-heavy slides
   - Speed: ~2.1s/slide
   - Cost: $0.015/1k output tokens (3x more expensive)
   - Verdict: FALLBACK for rate limit scenarios ✅

3. Gemini 1.5 Pro (Google)
   - Structured JSON: inconsistent, needs extra prompting
   - Content quality: good but less predictable
   - Speed: ~1.5s/slide
   - Cost: cheapest
   - Verdict: NOT using for now ❌

4. Mixtral 8x7b (open source)
   - Quality: significantly lower for business content
   - Verdict: NOT suitable ❌

Decision: GPT-4o primary, Claude 3.5 fallback. Both abstracted behind a provider interface so we can swap without changing application code.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["GPT-4o as primary AI model, Claude 3.5 Sonnet as fallback, abstracted behind a provider interface"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["GPT-4o best structured JSON output at $0.005/1k tokens, Claude 3.5 better prose but 3x more expensive, Gemini inconsistent formatting"], topics: ["ai-model", "architecture", "cost"] } },

  { id: "gm_ai_002", threadId: "gth_ai_001", m: 1, d: 8, h: 14,
    subject: "Re: AI Model Decision for WEAVE — Thoughts",
    from: "ayush@farship.io", to: "sumit@farship.io, swapnil@farship.io",
    snippet: "Good summary. One thing I'd add on the provider abstraction...",
    body: `Good summary. One thing I'd add on the provider abstraction:

We should expose model choice as a user setting for Pro users eventually. "Generate with GPT-4o (fast)" vs "Generate with Claude 3.5 (premium quality)" — different users will have different preferences. Some clients care more about speed, others about writing polish.

Also worth noting: the provider interface should include a streaming interface, not just a batch one. Streaming is what makes the UX feel fast and Framer animations smooth.

Ayush`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Provider interface must support streaming, expose model choice as a Pro user setting"], people: ["Ayush"], reasons: ["Streaming interface needed for UX animations, model choice is a potential premium feature differentiator"], topics: ["ai-model", "product", "architecture"] } },

  { id: "gm_ai_003", threadId: "gth_ai_001", m: 1, d: 9, h: 10,
    subject: "Re: AI Model Decision for WEAVE — Cost projection",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "On costs — let me run the numbers...",
    body: `On costs — let me run the numbers:

Assumptions:
- Average deck: 10 slides, ~150 output tokens per slide = 1500 tokens
- GPT-4o: $0.005/1k tokens = $0.0075 per deck
- If Pro user generates 30 decks/month: $0.23/user/month in AI costs
- At $8/month Pro price: margin is fine even at 50 decks/month

The model that blows up the economics is Claude 3.5: at 3x the cost, a heavy user generating 50 decks/month = $1.13/user in AI cost. Still manageable at $8/user price but tighter.

Conclusion: keep Claude as fallback only, not as the default path. If we ever offer "Claude mode" as a feature, it should be at a higher price tier (e.g., Pro+ at $15/user/month).

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Claude 3.5 to remain fallback only due to 3x cost, if offered as a feature it requires Pro+ tier at $15/user/month"], people: ["Sumit"], reasons: ["Claude cost at heavy usage would require higher pricing tier to maintain margins"], topics: ["cost", "pricing", "ai-model"] } },

  // ── Thread 4: Neon DB vs Supabase (4 emails) ──────────────────────────────────
  { id: "gm_db_001", threadId: "gth_db_001", m: 1, d: 5, h: 9,
    subject: "DB Choice: Neon vs Supabase — Decision",
    from: "sumit@farship.io", to: "ayush@farship.io",
    snippet: "Evaluated Neon vs Supabase over the weekend...",
    body: `Evaluated Neon vs Supabase over the weekend. Here's where I landed:

Neon:
- Serverless Postgres with auto-scaling + auto-suspend (costs $0 when idle)
- No cold starts (connection pooling via Neon proxy)
- Free tier: 3GB storage, 1 project
- No extra features (no auth, no realtime, no storage)
- Prisma compatibility: excellent

Supabase:
- Full Firebase alternative (auth, realtime, storage, edge functions)
- Postgres underneath but with a lot more infra
- More complex to set up correctly
- Free tier: 500MB DB, 1 project
- We'd be using 10% of what Supabase offers

Decision: Neon. We're already using Clerk for auth, Cloudflare R2 for storage. No need for Supabase's extras. Neon is just Postgres — simpler, and the auto-suspend saves cost in early stage.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Use Neon over Supabase for the database"], people: ["Sumit"], reasons: ["Neon is pure Postgres with auto-scaling and auto-suspend cost savings, Supabase extras are redundant since we use Clerk and R2"], topics: ["database", "infrastructure", "tech-stack"] } },

  { id: "gm_db_002", threadId: "gth_db_001", m: 1, d: 5, h: 11,
    subject: "Re: DB Choice: Neon vs Supabase",
    from: "ayush@farship.io", to: "sumit@farship.io",
    snippet: "Agreed. One thing to verify: Neon's branching feature...",
    body: `Agreed. One thing to verify: Neon's branching feature for dev environments. It lets you create instant DB branches (like git branches) for each PR. This would let us test DB migrations safely without affecting production. Worth setting up from day 1.

Also — for the free tier, 3GB is fine for now. When do we expect to hit that limit?

Ayush`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Use Neon DB branching feature for PR-based database environments"], people: ["Ayush"], reasons: ["Neon branches allow safe migration testing per PR without affecting production"], topics: ["database", "dev-workflow", "infra"] } },

  // ── Thread 5: Vercel Billing (3 emails) ───────────────────────────────────────
  { id: "gm_vcl_001", threadId: "gth_vcl_001", m: 2, d: 10, h: 9,
    subject: "Vercel Plan Upgrade — Need to move to Pro",
    from: "ayush@farship.io", to: "sumit@farship.io, swapnil@farship.io",
    snippet: "We're hitting the Vercel Hobby limits...",
    body: `We're hitting the Vercel Hobby limits:
- Bandwidth: 100GB/month, we're at 87GB and it's only the 10th
- Build minutes: 6000/month, at 5200 due to frequent deploys
- Edge functions: hitting 1000/day limit on the demo page

Need to upgrade to Vercel Pro ($20/month). This gets us:
- 1TB bandwidth
- Unlimited build minutes (within fair use)
- 500k edge function invocations/day

Given we're close to NovaBrands launch I don't want this to be a risk. Approving the upgrade myself, Sumit can you confirm it's fine from the budget side?

Ayush`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Upgrade Vercel to Pro plan at $20/month"], people: ["Ayush"], reasons: ["Hitting Hobby tier limits on bandwidth and edge functions ahead of NovaBrands launch"], topics: ["infrastructure", "cost", "hosting"] } },

  { id: "gm_vcl_002", threadId: "gth_vcl_001", m: 2, d: 10, h: 10,
    subject: "Re: Vercel Plan Upgrade",
    from: "sumit@farship.io", to: "ayush@farship.io",
    snippet: "Yes, go ahead. $20/month is fine...",
    body: `Yes, go ahead. $20/month is fine given the NovaBrands launch timing. Add it to the Farship card in 1Password vault.

One thing: can we set a Vercel spend alert at $50/month so we get notified if costs spike? The bandwidth usage looks high but I want to track if it keeps growing.

Sumit`,
    labels: ["INBOX"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── Thread 6: Monthly Expenses Feb (3 emails) ─────────────────────────────────
  { id: "gm_exp_001", threadId: "gth_exp_001", m: 3, d: 1, h: 10,
    subject: "February 2026 — Farship Monthly Expenses",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "February expenses summary...",
    body: `February expenses summary:

Infrastructure:
- Railway (backend): $12/month (upgraded from free)
- Vercel (frontend): $20/month (Pro)
- Neon DB: $0 (still on free tier, under 3GB)
- Cloudflare R2: $0.02 (negligible)

AI Costs:
- OpenAI (GPT-4o): $38.40 (based on Arkade usage, ~480 decks generated)
- Claude 3.5 (fallback): $4.20

Tools:
- Linear: $16/month (4 seats × $4)
- Figma: $30/month (3 seats × $10)
- 1Password: $5/month (team)

TOTAL February: $125.62

Notable: OpenAI is our biggest cost and growing. At Arkade's current pace + NovaBrands adding 12 users in March, project ~$120/month in AI costs by April.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Monitor OpenAI costs — projected to hit $120/month by April with NovaBrands onboarding"], people: ["Sumit"], reasons: ["OpenAI at $38.40 in Feb is largest expense and growing with user base"], topics: ["finance", "cost", "operations"] } },

  // ── Thread 7: Feature Freeze (4 emails) ───────────────────────────────────────
  { id: "gm_frz_001", threadId: "gth_frz_001", m: 3, d: 14, h: 14,
    subject: "WEAVE v1.0 Feature Freeze — March 15",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "Formally calling feature freeze for v1.0 as of tomorrow...",
    body: `Formally calling feature freeze for v1.0 as of tomorrow (March 15).

What's IN for v1.0:
✅ AI slide generation (GPT-4o, streaming)
✅ PPT + PDF export (Puppeteer-based, pixel-perfect)
✅ Brand kit (colors + logo)
✅ 9 templates
✅ Share links (view-only)
✅ SAML SSO (for NovaBrands)
✅ White-labeling + custom domain
✅ Freemium with 10 gen/month free, Pro at $8/user/month

What's OUT (v2 roadmap):
❌ Real-time collaboration
❌ AI image generation
❌ Native editable PPT shapes (vs PNG-based)
❌ Custom heading fonts in brand kit
❌ GitHub/Notion imports
❌ Executive summary auto-generation (NovaBrands request)

Launch target: March 31. That's 16 days to QA, fix bugs, and ship.

Any objections in the next 24 hours, otherwise this is locked.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["WEAVE v1.0 feature freeze March 15, launch March 31, v2 roadmap includes real-time collaboration, AI images, native PPT shapes, custom fonts"], people: ["Sumit"], reasons: ["16 days needed for QA before March 31 launch, scope discipline required after months of feature additions"], topics: ["product", "launch", "milestone", "scope"] } },

  { id: "gm_frz_002", threadId: "gth_frz_001", m: 3, d: 14, h: 15,
    subject: "Re: WEAVE v1.0 Feature Freeze",
    from: "ayush@farship.io", to: "sumit@farship.io, swapnil@farship.io",
    snippet: "No objections. This is the right call...",
    body: `No objections. This is the right call.

One thing I want to flag for QA: the mobile experience on the editor is not great — resizing slides on mobile is broken. Can we scope this as a known issue / "desktop optimized" for v1.0? I don't have time to fix it properly before the 31st.

Also, accessibility: the keyboard navigation on the slide canvas is working now (fixed yesterday). WCAG AA contrast passes on all themes. Good to ship.

Ayush`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Ship v1.0 as desktop-optimized, document mobile editor as known limitation"], people: ["Ayush"], reasons: ["Mobile slide resizing not fixable in 16 days, WCAG AA otherwise passing"], topics: ["scope", "mobile", "accessibility"] } },

  { id: "gm_frz_003", threadId: "gth_frz_001", m: 3, d: 14, h: 16,
    subject: "Re: WEAVE v1.0 Feature Freeze",
    from: "swapnil@farship.io", to: "sumit@farship.io, ayush@farship.io",
    snippet: "Agreed on the freeze. From a product/client side...",
    body: `Agreed on the freeze. From a product/client side:

Arkade and NovaBrands are both aware we're launching v1.0 on March 31. Both are fine with the scope.

For TechFlow (new prospect): I'll set expectations on the call Friday that mobile editing is v2. They're a startup, they'll understand.

One thing to add to QA list: the brand kit color picker on Safari — it's been reported to have issues. And PPT download on iOS Safari doesn't trigger the download dialog correctly.

Swapnil`,
    labels: ["INBOX"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── Thread 8: TechFlow prospect (3 emails) ────────────────────────────────────
  { id: "gm_tf_001", threadId: "gth_tf_001", m: 3, d: 19, h: 11,
    subject: "WEAVE Demo Follow-up — TechFlow",
    from: "swapnil@farship.io", to: "ananya.krishna@techflow.io",
    snippet: "Hi Ananya, great meeting you on Friday...",
    body: `Hi Ananya,

Great meeting you on Friday — thanks for your time and the very specific questions about WEAVE's AI generation quality.

As discussed, here's a summary of what WEAVE does for TechFlow's use case:
- Instant generation from a topic brief or bullet points
- 9 templates including Startup Pitch and Product Demo
- PPT + PDF export that holds formatting
- Brand kit to apply TechFlow's colors automatically
- Share links for client review

Based on your feedback that TechFlow generates ~8-10 decks/month for investor pitches and product updates, the Pro plan at $8/user/month would cover everything you need.

I've set up a 14-day trial for you and your co-founder (ananya@techflow.io and ravi@techflow.io). Go to app.weave.farship.io and sign in with your Google accounts.

Let me know how the trial goes!

Swapnil`,
    labels: ["SENT"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "gm_tf_002", threadId: "gth_tf_001", m: 3, d: 24, h: 14,
    subject: "Re: WEAVE Demo Follow-up — Ready to subscribe",
    from: "ananya.krishna@techflow.io", to: "swapnil@farship.io",
    snippet: "Hi Swapnil, tried WEAVE for a week with our team...",
    body: `Hi Swapnil,

Tried WEAVE for a week with Ravi and one of our team members. Short verdict: it's genuinely useful and we're going to subscribe.

The generation quality is impressive for investor decks — it structures the narrative well (problem, solution, market size, traction, team, ask). The speed is great. The export to PPT is clean enough for our investor meetings.

We'll go with 3 seats on the Pro plan. Can we pay by card monthly?

One request: can you add a "Series A Pitch" template? The current "Startup Pitch" is more general. A Series A specific one with the right narrative arc would save us a lot of editing.

Ananya
CEO, TechFlow`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["TechFlow subscribing to Pro plan (3 seats), request to add Series A Pitch template"], people: ["Ananya", "Swapnil"], reasons: ["TechFlow needs Series A specific narrative structure beyond current generic Startup Pitch template"], topics: ["client", "revenue", "templates", "product"] } },

  // ── Thread 9: Sprint Planning recap (3 emails) ────────────────────────────────
  { id: "gm_spr_001", threadId: "gth_spr_001", m: 2, d: 2, h: 18,
    subject: "Sprint 2 Planning — Summary & Assignments",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "Sprint 2 planning done. Here's the summary...",
    body: `Sprint 2 planning done. Summary:

Sprint 2 Goals (Feb 2-28):
1. Brand kit (Sumit: backend, Ayush: frontend)
2. 3 new templates — Pitch Deck, Product Update, Investor Update (Swapnil: content, Ayush: implementation)
3. PDF export (Sumit)
4. Performance: 10-slide generation < 10s (already done at 5.2s 🎉)
5. Share links (Sumit: API, Ayush: UI)

Key decisions from planning:
- Real-time collaboration: DEFERRED to v2. Too much scope for one sprint.
- Mobile editor: best-effort, not a sprint goal
- Rate limiting: ship the DB-based tracking this sprint, Redis if needed later

Velocity target: 80 story points (same as sprint 1, we hit 76)

Let's go.

Sumit`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Sprint 2 scope: brand kit, 3 templates, PDF export, share links. Real-time collaboration deferred to v2"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["Real-time collaboration too large for one sprint, team velocity target 80 story points"], topics: ["sprint", "planning", "scope"] } },

  // ── Thread 10: Legal NDA (2 emails) ───────────────────────────────────────────
  { id: "gm_nda_001", threadId: "gth_nda_001", m: 1, d: 28, h: 11,
    subject: "Design Contractor NDA — Vikram Nair",
    from: "swapnil@farship.io", to: "sumit@farship.io",
    snippet: "We're bringing on Vikram Nair as a freelance designer...",
    body: `We're bringing on Vikram Nair as a freelance designer for 2 weeks — he'll work on the 9 launch templates and slide design system.

I've sent him our standard NDA via DocuSign. Before he gets access to the codebase or design files, I need him to sign.

NDA covers: IP assignment for work done during the engagement, non-disclosure of client names (Arkade, NovaBrands), non-compete for 6 months post-engagement.

Rate: ₹3,000/hour, estimated 40 hours = ₹1,20,000 total.

Sumit, please confirm the budget is approved.

Swapnil`,
    labels: ["SENT"],
    entities: { is_relevant: true, decisions: ["Hire Vikram Nair as freelance designer for template design at ₹3,000/hr, 40 hours total"], people: ["Swapnil", "Sumit", "Vikram Nair"], reasons: ["Need 9 templates and slide design system for v1.0 launch, requires specialized design skills"], topics: ["hiring", "design", "legal", "finance"] } },

  { id: "gm_nda_002", threadId: "gth_nda_001", m: 1, d: 28, h: 14,
    subject: "Re: Design Contractor NDA",
    from: "sumit@farship.io", to: "swapnil@farship.io",
    snippet: "Budget approved. ₹1.2L is fine for the templates...",
    body: `Budget approved. ₹1.2L is fine for the templates — this is the biggest single design investment we're making for v1.0 and the templates are a core differentiator.

One addition to the NDA: make sure it explicitly covers the template designs and slide system as Farship IP. We're planning to license the template designs commercially as part of the product.

Also, give Vikram read-only access to the Figma workspace — not the codebase.

Sumit`,
    labels: ["INBOX"],
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── Thread 11: Hiring — Backend Intern (3 emails) ─────────────────────────────
  { id: "gm_hire_001", threadId: "gth_hire_001", m: 3, d: 8, h: 10,
    subject: "Backend Intern Search — Let's start looking",
    from: "ayush@farship.io", to: "sumit@farship.io, swapnil@farship.io",
    snippet: "Sumit is handling too much backend alone. We should hire a backend intern...",
    body: `Sumit is handling too much backend alone. With NovaBrands enterprise onboarding and the v1.0 sprint, he's at capacity. I think we should bring in a backend intern to help with:
- API endpoint scaffolding
- DB migration management
- Test coverage (currently at ~30%, should be 60%+)
- Rate limiting improvements

I can post on LinkedIn + Wellfound. What's the stipend budget? I'd say ₹20-25k/month for a 3-month internship.

Ayush`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Hire backend intern at ₹20-25k/month for 3 months to help with API work and test coverage"], people: ["Ayush", "Sumit"], reasons: ["Sumit is at capacity with NovaBrands enterprise work and v1.0 sprint, test coverage at 30% needs improvement"], topics: ["hiring", "team", "operations"] } },

  { id: "gm_hire_002", threadId: "gth_hire_001", m: 3, d: 9, h: 11,
    subject: "Re: Backend Intern Search",
    from: "sumit@farship.io", to: "ayush@farship.io, swapnil@farship.io",
    snippet: "Yes please. The test coverage point especially...",
    body: `Yes please. The test coverage point especially — I've been meaning to fix it for 2 months but always something more urgent. An intern focused on this would unblock a lot of future refactoring confidence.

Posting on Wellfound is probably best for reach. Let me write the JD — I want someone with TypeScript experience specifically, not just Node.js generics. The Prisma schema work and our service layer needs typed code.

Stipend: ₹22,000/month is fair for a 3rd/4th year student. Start after v1.0 launch (April 1 onwards) so we're not onboarding them during crunch.

Sumit`,
    labels: ["INBOX"],
    entities: { is_relevant: true, decisions: ["Backend intern hiring: ₹22k/month, TypeScript required, start April 1 post-launch"], people: ["Sumit"], reasons: ["Start post-launch avoids intern onboarding during v1.0 crunch, TypeScript required for Prisma schema work"], topics: ["hiring", "team"] } },
];

// ── Drive Data ─────────────────────────────────────────────────────────────────
export interface DriveSeed {
  id: string; displayName: string; fileIds: string[]; m: number; d: number;
  text: string; entities: SeedEntities;
}

export const DRIVE_DOCS: DriveSeed[] = [
  // ── Client Docs (20) ──────────────────────────────────────────────────────────
  { id: "drv_cli_001", displayName: "Arkade Studio — Client Brief v1", fileIds: ["gdoc_ark_brief_01"], m: 1, d: 22,
    text: `CLIENT BRIEF — Arkade Studio
Filed: January 22, 2026 | Account Manager: Swapnil

Organization: Arkade Studio (arkadestudio.in)
Contact: Rohan Mehta, Founder & Creative Director

Business: Boutique creative agency specializing in pitch deck creation for D2C startups and early-stage SaaS companies. Portfolio of 40+ clients. Team of 6.

Current workflow: Gamma AI for initial generation → manual design cleanup in Figma → export to PDF for client delivery. Total time: 6-8 hours per deck.

Pain points:
1. Gamma output requires heavy manual cleanup (30-40% content editing)
2. PPT export from Gamma breaks formatting when clients open in Microsoft PowerPoint
3. No brand presets — must reapply brand colors for each client's deck manually
4. Template quality is generic, doesn't match agency-level design standards

Requirements for WEAVE:
- Generation quality good enough to reduce editing to < 15%
- Clean PPT export that opens correctly in PowerPoint 2019+
- Brand kit: save colors + logo per client, auto-apply on generation
- At minimum: Pitch Deck, Product Demo, Investor Update templates

Success metric: Replace Gamma + Figma workflow entirely within 30 days of beta access.

Contract value: Pro plan (4 seats) → ₹2,560/month post-beta`,
    entities: { is_relevant: true, decisions: ["Arkade Studio success metric: replace Gamma + Figma workflow within 30 days"], people: ["Swapnil", "Rohan Mehta"], reasons: ["Arkade's current workflow takes 6-8 hours per deck, WEAVE targets under 2 hours"], topics: ["client", "requirements", "product"] } },

  { id: "drv_cli_002", displayName: "NovaBrands — Enterprise Requirements Doc", fileIds: ["gdoc_nova_req_01"], m: 2, d: 22,
    text: `ENTERPRISE REQUIREMENTS — NovaBrands
Filed: February 22, 2026 | Account Manager: Swapnil

Organization: NovaBrands (novabrands.com)
Contact: Priya Kapoor, Head of Digital Delivery
Users: 12 (pilot), potentially 30+ post-pilot

Business: Full-service brand and communications agency. Specializes in creating QBR (Quarterly Business Review) decks, annual report presentations, and strategy documents for FMCG and enterprise clients.

Deck profile: 25-35 slides per deck, heavy data visualization, executive-level audience, strict brand compliance.

Technical requirements:
1. SSO: SAML 2.0 via Okta (non-negotiable — company policy)
2. White-labeling: remove all WEAVE branding, display NovaBrands logo
3. Custom domain: presentations.novabrands.com with SSL
4. Data residency: India preferred (not a hard requirement for pilot)
5. SLA: 99.5% uptime, 4-hour support response during IST business hours

Feature requirements:
1. Speaker notes: detailed (3-4 sentences per slide), not just bullet points
2. Brand kit: must support custom heading fonts (critical for brand compliance)
3. Executive summary: auto-generated first slide summarizing the deck
4. Template: QBR template with standard sections (highlights, challenges, next quarter plan)

Pilot scope: 3 months, fixed price ₹2,40,000. Includes setup, SSO configuration, onboarding.

Post-pilot: ₹12,000/seat/year (30 seats = ₹3,60,000/year ARR)`,
    entities: { is_relevant: true, decisions: ["NovaBrands enterprise pilot: SAML SSO, white-label, custom domain, ₹2.4L for 3 months"], people: ["Swapnil", "Priya Kapoor"], reasons: ["NovaBrands requires enterprise-grade features for strict brand compliance and FMCG client standards"], topics: ["enterprise", "client", "contract", "requirements"] } },

  { id: "drv_cli_003", displayName: "TechFlow — Demo Notes & Proposal", fileIds: ["gdoc_tf_demo_01"], m: 3, d: 20,
    text: `SALES NOTES — TechFlow Demo
Date: March 19, 2026 | Sales: Swapnil

Company: TechFlow (techflow.io) — Series A stage SaaS startup (~40 employees)
Contact: Ananya Krishna, CEO | Ravi Sharma, COO

Use case: Investor relations decks (Series A fundraising), product update presentations for board, customer success reviews.

Volume: 8-10 decks/month, avg 12 slides per deck.

Demo reaction:
- Generation speed: very impressed ("faster than anything we've tried")
- Content quality: "needs some editing but 70% of the way there on first pass"
- Templates: want a Series A Pitch specific template (current Startup Pitch is too generic)
- Export: PPT export quality was praised — opened in Keynote without issues

Objections handled:
- "Is this just another Gamma?" → Showed export comparison, streaming speed, brand kit
- "What about data privacy?" → Explained: no deck content stored after export unless user saves

Decision: Ananya wants to sign up for Pro (3 seats). She'll confirm after a 1-week trial.

Contract expected: Pro 3 seats = ₹1,920/month

Follow-up: Add Series A Pitch template (Swapnil to provide narrative structure)`,
    entities: { is_relevant: true, decisions: ["TechFlow converting to Pro 3 seats at ₹1,920/month after trial"], people: ["Swapnil", "Ananya Krishna", "Ravi Sharma"], reasons: ["Strong demo reaction, Series A template request is a differentiator to add"], topics: ["client", "sales", "revenue"] } },

  // ── Contracts (15) ────────────────────────────────────────────────────────────
  { id: "drv_con_001", displayName: "NovaBrands — Enterprise Pilot Agreement", fileIds: ["gdoc_nova_contract_01"], m: 3, d: 1,
    text: `ENTERPRISE PILOT AGREEMENT
Parties: Farship Technologies Pvt. Ltd. ("Provider") and NovaBrands Creative Agency Pvt. Ltd. ("Client")
Date: March 1, 2026
Duration: 3 months (March 1 – May 31, 2026)

Services: Access to WEAVE enterprise platform with white-labeling, custom domain (presentations.novabrands.com), SAML 2.0 SSO integration via Okta, priority support (4-hour SLA).

Seats: 12 user accounts included. Additional seats at ₹1,000/seat/month.

Payment: ₹2,40,000 payable in full within 7 days of contract signing via NEFT.
Payment received: March 2, 2026 ✓

SLA:
- Uptime: 99.5% monthly (excludes scheduled maintenance)
- Support response: 4 business hours (IST 9am–6pm, Mon–Fri)
- Incident severity: P1 (platform down) → 1hr response; P2 (major feature broken) → 4hr; P3 → next business day

Data handling: All presentation data processed and stored on servers in Singapore (AWS ap-southeast-1). GDPR-equivalent data handling. No third-party sharing without consent.

IP: All presentations and content generated via WEAVE are owned by Client. WEAVE retains the right to use aggregate anonymized usage data for product improvement.

Post-pilot renewal terms: ₹12,000/seat/year (negotiable for 30+ seats).

Signed:
Farship Technologies: Sumit Gondkar (Director)
NovaBrands: Priya Kapoor (Head of Digital Delivery, authorized signatory)`,
    entities: { is_relevant: true, decisions: ["NovaBrands Enterprise pilot contract signed March 1, 2026, ₹2.4L for 3 months, 12 seats"], people: ["Sumit", "Priya Kapoor"], reasons: ["Formal contract establishes SLA, IP ownership, and post-pilot renewal terms"], topics: ["contract", "enterprise", "legal"] } },

  { id: "drv_con_002", displayName: "Vikram Nair — Design Contractor NDA & SOW", fileIds: ["gdoc_vikram_nda_01"], m: 1, d: 29,
    text: `CONTRACTOR AGREEMENT & NDA
Parties: Farship Technologies Pvt. Ltd. and Vikram Nair (Freelance Designer)
Date: January 29, 2026

Scope of Work:
1. Design 9 WEAVE presentation templates: Startup Pitch, Product Update, Investor Update, Sales Deck, QBR, Team Standup, Workshop/Training, Case Study, Company Overview
2. Define WEAVE slide design system: typography scale, spacing, layout grids, icon style
3. Deliver Figma source files and export-ready assets

Timeline: February 1–14, 2026 (14 days)
Rate: ₹3,000/hour, estimated 40 hours. Fixed cap: ₹1,20,000.

IP Assignment: All work produced during this engagement is the sole property of Farship Technologies, including template designs, design system components, and any derivative works.

Non-disclosure: Contractor agrees not to disclose client names (including Arkade Studio and NovaBrands), product features, or business information. Duration: 2 years.

Non-compete: Contractor will not work for direct WEAVE competitors (Gamma, Beautiful.ai, Canva AI) for 6 months post-engagement.

Signed: January 29, 2026`,
    entities: { is_relevant: true, decisions: ["Engage Vikram Nair for template design at ₹3,000/hr capped at ₹1.2L, IP assigned to Farship"], people: ["Swapnil", "Sumit", "Vikram Nair"], reasons: ["Professional template design is critical for v1.0 launch quality, IP must be assigned"], topics: ["legal", "hiring", "design", "contract"] } },

  { id: "drv_con_003", displayName: "Arkade Studio — Beta MOU", fileIds: ["gdoc_ark_mou_01"], m: 1, d: 21,
    text: `BETA ACCESS MEMORANDUM OF UNDERSTANDING
Parties: Farship Technologies and Arkade Studio
Date: January 21, 2026

Beta Access Terms:
- Arkade Studio receives free beta access to WEAVE from January 22 – March 31, 2026
- Access includes: 50 deck generations/month, PPT + PDF export, brand kit, team (4 users)
- In exchange: Arkade Studio agrees to provide structured feedback at week 2, week 4, and week 8

Feedback requirements:
- Written feedback report covering: generation quality, export quality, workflow fit
- 1 x 30-min video call per feedback round
- Permission for Farship to use Arkade Studio name as a beta customer reference

Data: All beta data may be retained by Arkade Studio. Farship will not share deck content externally.

Post-beta: Arkade Studio may continue on Pro plan at standard pricing. No obligation to subscribe.

Signed: Rohan Mehta (Arkade Studio) | Sumit Gondkar (Farship Technologies)`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  // ── Invoices (20) ─────────────────────────────────────────────────────────────
  { id: "drv_inv_001", displayName: "Invoice — Vercel Pro Feb 2026", fileIds: ["inv_vercel_feb26"], m: 3, d: 1,
    text: `INVOICE
Vendor: Vercel Inc.
Invoice #: VCRL-2026-02-8841
Date: March 1, 2026 (for February usage)
Bill to: Farship Technologies Pvt. Ltd.

Plan: Vercel Pro
Period: February 1–28, 2026

Line items:
- Pro subscription: $20.00
- Bandwidth overage: $0.00 (1TB included, used 340GB)
- Edge function invocations: $0.00 (within plan)
- Build minutes: $0.00 (within plan)

Total: $20.00 USD
INR equivalent: ₹1,680 (at ₹84/USD)

Status: PAID (auto-charge card on file)
Payment date: March 1, 2026`,
    entities: { is_relevant: true, decisions: [], people: ["Sumit"], topics: ["billing", "infrastructure", "hosting"], reasons: [] } },

  { id: "drv_inv_002", displayName: "Invoice — OpenAI API Feb 2026", fileIds: ["inv_openai_feb26"], m: 3, d: 1,
    text: `INVOICE
Vendor: OpenAI Inc.
Invoice #: OAI-INV-2026-02-44821
Date: March 1, 2026 (for February usage)
Bill to: Farship Technologies

Usage breakdown:
- gpt-4o input tokens: 18,420,000 tokens @ $0.0025/1k = $46.05
- gpt-4o output tokens: 7,680,000 tokens @ $0.01/1k = $76.80  [Note: output pricing updated]
- Total API usage: $38.40 (post volume discount)

Note: 480 decks generated in February. Avg cost per deck: $0.08.

Total: $38.40 USD
INR equivalent: ₹3,226

Status: PAID
Payment date: March 1, 2026`,
    entities: { is_relevant: true, decisions: [], people: ["Sumit"], topics: ["billing", "ai-cost", "operations"], reasons: [] } },

  { id: "drv_inv_003", displayName: "Invoice — Neon DB Jan 2026", fileIds: ["inv_neon_jan26"], m: 2, d: 1,
    text: `INVOICE
Vendor: Neon Tech Inc.
Invoice #: NEON-2026-01-3311
Date: February 1, 2026
Bill to: Farship Technologies

Plan: Neon Free Tier
Period: January 2026

Usage:
- Compute hours: 312 hours active (auto-suspend working correctly)
- Storage: 1.8GB of 3GB limit
- Branches: 4 active (main, staging, dev/pr-12, dev/pr-18)

Total: $0.00 (within free tier limits)

Notes: Approaching storage limit — currently at 60% of 3GB free tier. Will need to consider paid plan if data grows >3GB. Launch Pro plan at $19/month if needed.

Status: NO CHARGE`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "drv_inv_004", displayName: "Invoice — Railway Backend Mar 2026", fileIds: ["inv_railway_mar26"], m: 3, d: 31,
    text: `INVOICE
Vendor: Railway Corp.
Invoice #: RW-MAR2026-9921
Date: March 31, 2026
Bill to: Farship Technologies

Plan: Railway Pro (Hobby+ equivalent)
Period: March 2026

Services:
- Backend server (Node.js, 1GB RAM, 1 vCPU): $12.00
- Redis instance (for rate limiting): $4.00

Total: $16.00 USD
INR equivalent: ₹1,344

Status: PAID`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "drv_inv_005", displayName: "Invoice — AWS Lambda (Puppeteer) Mar 2026", fileIds: ["inv_aws_lambda_mar26"], m: 3, d: 31,
    text: `INVOICE
Vendor: Amazon Web Services
Account: 482910-FARSHIP
Invoice #: AWS-MAR2026-FARSHIP-001
Date: March 31, 2026

Service: AWS Lambda (us-east-1)
Use case: Puppeteer slide rendering for PPT/PDF export

Invocations: 4,820 (one per slide rendered)
Avg duration: 1.2 seconds per invocation
Memory: 1024MB per function

Compute charges: 4,820 × 1.2s × 1GB = 5,784 GB-seconds @ $0.0000166667 = $0.096
Request charges: 4,820 × $0.0000002 = $0.001

Total: $0.097 USD (~₹8)

Status: PAID (minimal cost, within AWS free tier partially)`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "drv_inv_006", displayName: "Invoice — Figma Organization Mar 2026", fileIds: ["inv_figma_mar26"], m: 3, d: 31,
    text: `INVOICE
Vendor: Figma Inc.
Invoice #: FIG-2026-03-77234
Date: March 31, 2026
Bill to: Farship Technologies

Plan: Figma Organization (3 seats)
Seats: Sumit Gondkar, Ayush Mathur, Swapnil Patil

Monthly charge: $45.00 (3 seats × $15/seat)
INR: ₹3,780

Status: PAID`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "drv_inv_007", displayName: "Invoice — Linear Team Jan 2026", fileIds: ["inv_linear_jan26"], m: 2, d: 1,
    text: `INVOICE
Vendor: Linear Orbit Inc.
Invoice #: LIN-JAN2026-4421
Date: February 1, 2026
Bill to: Farship Technologies

Plan: Linear Team
Seats: 3 (Sumit, Ayush, Swapnil) + 1 guest (Vikram Nair)
Monthly: $16.00 (4 × $4/seat)
INR: ₹1,344

Status: PAID`,
    entities: { is_relevant: false, decisions: [], people: [], reasons: [], topics: [] } },

  { id: "drv_inv_008", displayName: "Invoice — Cloudflare R2 Feb 2026", fileIds: ["inv_r2_feb26"], m: 3, d: 1,
    text: `INVOICE
Vendor: Cloudflare Inc.
Account: farship-prod
Invoice #: CF-2026-02-99128
Date: March 1, 2026

Service: Cloudflare R2 Storage
Usage:
- Storage: 12.4 GB stored × $0.015/GB = $0.186
- Class A ops (PUT/POST): 48,200 ops × $4.50/million = $0.217
- Class B ops (GET): 184,000 ops × $0.36/million = $0.066
- Egress: $0.00 (R2 has zero egress fees)

Total: $0.47 USD

Note: Egress $0 is the key advantage vs S3 — at our download volume, S3 would cost ~$18/month in egress. R2 saves $17.50/month at current scale.

Status: PAID`,
    entities: { is_relevant: true, decisions: [], people: ["Sumit"], topics: ["billing", "storage", "cost-optimization"], reasons: [] } },

  // ── Architecture / ADRs (15) ──────────────────────────────────────────────────
  { id: "drv_adr_001", displayName: "ADR-001: AI Model Selection", fileIds: ["gdoc_adr_001"], m: 1, d: 9,
    text: `ARCHITECTURE DECISION RECORD #001
Title: AI Model Selection for Slide Generation
Date: January 9, 2026
Status: ACCEPTED
Author: Sumit Gondkar
Reviewed by: Ayush Mathur, Swapnil Patil

Context:
WEAVE needs an LLM to generate slide content from a user prompt. The model must return structured JSON (one object per slide), support streaming, and produce business-quality content. We evaluated 4 options.

Decision:
Use GPT-4o as the primary model with Claude 3.5 Sonnet as fallback. Both accessed via a provider abstraction interface.

Reasoning:
1. GPT-4o produces the most reliable structured JSON output across 200 test prompts (2% malformed vs 8% for Claude 3.5)
2. GPT-4o streaming latency: first token at ~400ms, enabling fast UI feedback
3. Claude 3.5 produces better prose quality but at 3x the cost ($0.015 vs $0.005 per 1k output tokens)
4. Gemini 1.5 Pro had inconsistent JSON schema adherence (15% deviation rate)
5. Open-source models (Mixtral) produced significantly lower business content quality

Provider abstraction design:
interface ModelProvider {
  generateSlide(prompt: string, schema: JSONSchema): AsyncGenerator<SlideChunk>
}
Implementations: OpenAIProvider, ClaudeProvider (fallback)

Consequences:
+ Model swap is a config change, not a code change
+ Can offer model choice as a user-facing premium feature
- Added abstraction layer complexity
- Must maintain two provider implementations

Alternatives rejected:
- Gemini-only: cheaper but quality/consistency insufficient for launch
- Claude-primary: better prose but 3x cost unsustainable at scale`,
    entities: { is_relevant: true, decisions: ["GPT-4o as primary AI model, Claude 3.5 as fallback, abstracted behind ModelProvider interface"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["GPT-4o has 2% malformed JSON vs 8% for Claude, Claude 3x more expensive despite better prose quality"], topics: ["architecture", "ai-model", "decision"] } },

  { id: "drv_adr_002", displayName: "ADR-002: Database Architecture", fileIds: ["gdoc_adr_002"], m: 1, d: 6,
    text: `ARCHITECTURE DECISION RECORD #002
Title: Database Technology Selection
Date: January 6, 2026
Status: ACCEPTED
Author: Sumit Gondkar

Context:
WEAVE needs persistent storage for: user accounts, presentations (JSONB documents), generation history, brand kits, export records, and rate limiting counters.

Decision:
Use Neon (serverless PostgreSQL) as the primary database via Prisma ORM.

Reasoning:
1. Neon auto-suspends when idle → $0 cost in early stage when traffic is low
2. No cold start issues (Neon connection proxy maintains warm connections)
3. Full PostgreSQL compatibility — JSONB for presentation documents, standard relational for everything else
4. Prisma ORM provides type-safe queries, auto-migrations, and excellent DX
5. Neon branching for dev environments (PR-based DB branches)
6. Free tier: 3GB storage, sufficient for 6+ months of growth

Schema decisions:
- Presentations stored as JSONB (not normalized) — document-oriented access pattern, no join overhead
- Rate limiting in Postgres (not Redis) for v1 — reduce infra complexity, revisit if query rate is an issue
- Indices: composite on (user_id, created_at) for all user-scoped tables

Alternatives rejected:
- Supabase: full-stack BaaS with extras we don't need (auth → Clerk, storage → R2)
- PlanetScale: MySQL-based, less flexible for JSONB storage
- MongoDB: flexible but loses relational integrity guarantees`,
    entities: { is_relevant: true, decisions: ["Use Neon serverless PostgreSQL with Prisma ORM, presentations stored as JSONB"], people: ["Sumit"], reasons: ["Neon auto-suspend saves cost, JSONB avoids join overhead for document-oriented presentation data"], topics: ["database", "architecture", "infra"] } },

  { id: "drv_adr_003", displayName: "ADR-003: Export Architecture (PPT/PDF)", fileIds: ["gdoc_adr_003"], m: 2, d: 12,
    text: `ARCHITECTURE DECISION RECORD #003
Title: PPT and PDF Export Architecture
Date: February 12, 2026
Status: ACCEPTED
Author: Sumit Gondkar

Context:
WEAVE must export presentations as both PPT and PDF files. The export must be pixel-perfect (matching what the user sees in the browser editor).

Decision:
Use Puppeteer (headless Chromium) running on AWS Lambda to render slides as PNG images, then embed them into PPT (via pptxgenjs) and PDF (via pdf-lib).

Reasoning:
1. Native PPTX shape generation via pptxgenjs produces lower quality than browser-rendered output — CSS animations, gradients, and custom fonts don't translate cleanly to PPTX primitives
2. PNG-based PPT embedding is pixel-perfect and format-stable across PowerPoint versions
3. Lambda isolates the heavy Puppeteer process from the main Railway server (avoids 512MB RAM limit)
4. Lambda cold start (800ms) is acceptable for export use case (not latency-sensitive like generation)
5. Lambda cost at current scale: <$0.10/month — negligible

Trade-offs:
- PNG-based PPT is not natively editable in PowerPoint
- Added Lambda infra complexity

Follow-up (v1.1):
Add native shape export as a user-selectable option ("Editable / lower fidelity" vs "Pixel-perfect / image-based")

Alternatives rejected:
- pptxgenjs shapes directly: quality insufficient, CSS translation too lossy
- Google Slides API export: external dependency, requires OAuth, unpredictable`,
    entities: { is_relevant: true, decisions: ["Use Puppeteer on AWS Lambda for PPT/PDF export, PNG-based for pixel-perfect fidelity"], people: ["Sumit"], reasons: ["CSS/animations don't translate to PPTX primitives cleanly, Lambda isolates Puppeteer from main server"], topics: ["export", "architecture", "infra"] } },

  { id: "drv_adr_004", displayName: "ADR-004: Authentication Strategy", fileIds: ["gdoc_adr_004"], m: 1, d: 8,
    text: `ARCHITECTURE DECISION RECORD #004
Title: Authentication Strategy
Date: January 8, 2026
Status: ACCEPTED
Author: Sumit Gondkar

Context:
WEAVE needs user authentication with Google OAuth (primary), email/password (secondary), and SAML SSO for enterprise customers.

Decision:
Use Clerk as the authentication provider for consumer auth (Google, email). Implement passport-saml separately for enterprise SAML SSO.

Reasoning:
1. Clerk provides hosted auth UI, React components, and webhooks out of the box
2. Clerk handles Google OAuth, email, and magic links without custom implementation
3. Clerk's organization features will support team workspaces in v2
4. SAML is not supported by Clerk on their Growth plan — implement passport-saml directly for enterprise customers
5. Clerk free tier: 10,000 MAU — sufficient for launch

SAML implementation (for NovaBrands):
- passport-saml library
- SP metadata endpoint: /auth/saml/metadata
- Assertion consumer: /auth/saml/callback
- Tested with Okta IdP

Alternatives rejected:
- NextAuth: flexible but requires 1 week of custom implementation for Google + email + SAML
- Auth0: similar to Clerk but more expensive at scale, DX is worse`,
    entities: { is_relevant: true, decisions: ["Use Clerk for consumer auth, passport-saml for enterprise SAML SSO"], people: ["Sumit"], reasons: ["Clerk handles Google OAuth and magic links out of the box, SAML requires passport-saml due to Clerk plan limitations"], topics: ["auth", "architecture", "enterprise"] } },

  { id: "drv_adr_005", displayName: "ADR-005: Slide Generation Pipeline", fileIds: ["gdoc_adr_005"], m: 1, d: 20,
    text: `ARCHITECTURE DECISION RECORD #005
Title: AI Slide Generation Pipeline
Date: January 20, 2026
Status: ACCEPTED
Author: Sumit Gondkar

Context:
The core WEAVE feature: take a user prompt, return a fully-structured presentation. The pipeline must be fast, streamable, and reliable.

Decision:
Two-phase pipeline: (1) outline generation, (2) parallel per-slide generation with SSE streaming.

Phase 1 — Outline (1 GPT-4o call, ~800ms):
Input: user prompt + selected template
Output: JSON array of { slideTitle, slideType, keyPoints[] } for each slide

Phase 2 — Per-slide content (N parallel GPT-4o calls):
Input: slide outline item + full deck context
Output: { title, subtitle, bullets[], speakerNotes, layout }
Parallelism: Promise.all() — all slides generated simultaneously
Streaming: each slide streams via SSE as it completes

Total latency (10 slides): ~4-6s (phase 1 + longest single slide generation)
First slide visible: ~1.8s

Error handling:
- If a slide fails, retry once then use a placeholder
- If phase 1 fails, return error to user immediately
- Rate limits: 5 retries with exponential backoff

Consequences:
+ Perceived latency very low (streaming)
+ Quality high (each slide has full context from outline)
- Higher OpenAI cost than single-call approaches (N+1 calls vs 1)
- Parallel calls require careful rate limit management`,
    entities: { is_relevant: true, decisions: ["Two-phase generation: outline in 1 call then parallel per-slide calls with SSE streaming"], people: ["Sumit"], reasons: ["Parallel per-slide generation enables streaming and improves quality vs single large prompt"], topics: ["ai-pipeline", "architecture", "performance"] } },

  // ── Product Specs (10) ────────────────────────────────────────────────────────
  { id: "drv_prd_001", displayName: "WEAVE v1.0 — Feature Spec", fileIds: ["gdoc_spec_v1_01"], m: 1, d: 15,
    text: `WEAVE v1.0 PRODUCT SPECIFICATION
Author: Swapnil Patil | Date: January 15, 2026 | Status: APPROVED

Product overview:
WEAVE is an AI-powered presentation generator designed for startup teams and creative agencies. Users describe what they want, WEAVE generates a complete, designed presentation, ready to share or export.

Target users:
- Primary: Founders building pitch decks, product teams creating update decks
- Secondary: Creative agencies generating client presentations
- Enterprise: Brand agencies needing white-labeled presentation tools

Core features for v1.0:

1. AI Generation
   - Input: free-text prompt describing the presentation
   - Template selection: choose from 9 base templates
   - Output: 5-30 slides with title, content, bullets, and speaker notes
   - Streaming: slides appear as they're generated

2. Editor
   - Edit any AI-generated slide inline
   - Reorder slides via drag-and-drop
   - Add/delete slides
   - Fixed 16:9 canvas, 6 theme options
   - Font size defaults: title 44px, body 22px

3. Brand Kit
   - Upload logo (PNG/SVG)
   - Set 5 brand colors (primary, secondary, accent, background, text)
   - Auto-apply to all slides on generation and theme switch

4. Export
   - PPT: pixel-perfect, image-based (opens in PowerPoint/Keynote)
   - PDF: print-optimized
   - Share link: view-only public URL

5. Pricing
   - Free: 10 generations/month, 3 saved presentations
   - Pro ($8/user/month): unlimited generations, unlimited saves, brand kit, share links
   - Enterprise: white-label, SSO, custom domain, SLA

Non-goals for v1.0:
- Real-time collaboration
- AI image generation
- GitHub/Notion import
- Custom fonts in brand kit
- Native editable PPTX shapes`,
    entities: { is_relevant: true, decisions: ["WEAVE v1.0 ships with AI generation, editor, brand kit, PPT/PDF export, and freemium pricing"], people: ["Swapnil"], reasons: ["Focused v1 scope targets startup founders and agencies with core generation and export workflow"], topics: ["product", "specification", "scope"] } },

  { id: "drv_prd_002", displayName: "WEAVE Pricing Tiers — Decision Doc", fileIds: ["gdoc_pricing_01"], m: 2, d: 8,
    text: `PRICING TIERS DECISION DOCUMENT
Author: Swapnil Patil (with input from Sumit) | Date: February 8, 2026

Context:
We need to finalize pricing before the NovaBrands proposal and public launch. Three models evaluated: freemium, per-seat, usage-based.

Decision: Freemium

Tier structure:
FREE:
- 10 AI generations/month
- 3 saved presentations (older ones archived, not deleted)
- PPT + PDF export
- 2 themes
- No brand kit

PRO — $8/user/month (₹672):
- Unlimited AI generations
- Unlimited saved presentations
- All 9 themes
- Brand kit (logo + colors)
- Share links
- Priority support email

ENTERPRISE — Custom pricing:
- Everything in Pro
- White-label
- Custom domain
- SAML SSO
- Dedicated account manager
- SLA (99.5% uptime, 4hr support)
- Starting at ₹2,40,000/year for 12 seats

Rationale:
- Freemium drives word-of-mouth (vs per-seat which requires sales motion)
- $8/user is 20% less than Gamma ($10) — clear price advantage
- Free tier is generous enough to be genuinely useful (10 decks/month for small users)
- Enterprise custom pricing avoids commoditizing our highest-value tier

AI cost projection at Pro pricing:
- Avg cost per user per month: $0.30 (30 decks × $0.01 avg)
- Gross margin at $8: ~97% (before infra and support costs)
- Break-even per Pro user: covered by first month`,
    entities: { is_relevant: true, decisions: ["Freemium pricing: Free 10 gen/month, Pro $8/user/month, Enterprise custom from ₹2.4L/year"], people: ["Swapnil", "Sumit"], reasons: ["Freemium drives word-of-mouth, $8 undercuts Gamma by 20%, enterprise pricing avoids commoditization"], topics: ["pricing", "monetization", "product"] } },

  { id: "drv_prd_003", displayName: "WEAVE v2 Roadmap — Q2 2026", fileIds: ["gdoc_roadmap_q2_01"], m: 3, d: 28,
    text: `WEAVE v2 ROADMAP — Q2 2026 (April–June)
Author: Swapnil Patil | Date: March 28, 2026

Context: v1.0 shipped March 31. v2 planning based on:
- Arkade Studio feedback (3 months of beta)
- NovaBrands first month enterprise feedback
- TechFlow trial observations

Priority 1 — Enterprise readiness (April):
1. Custom heading fonts in brand kit (NovaBrands P1 request)
2. Detailed speaker notes mode (3-4 sentences per slide)
3. Auto-generated executive summary slide
4. Native editable PPTX shapes export option
5. Series A Pitch template (TechFlow request)

Priority 2 — Quality & polish (May):
6. AI image generation using DALL-E 3 (per-slide image prompt)
7. Presentation analytics (view count, time spent per slide for share links)
8. Template editor (users can modify and save custom templates)
9. Mobile editor basic support (view + simple text edit)

Priority 3 — Growth features (June):
10. Team workspaces (share brand kits across org)
11. Real-time commenting on share links (not co-editing yet)
12. Notion + Figma import as presentation input
13. Usage analytics dashboard for Enterprise admins

Revenue target for Q2: $15k MRR (from ~$3k at v1.0 launch)`,
    entities: { is_relevant: true, decisions: ["v2 Q2 2026 roadmap: custom fonts, detailed speaker notes, AI images, team workspaces, real-time comments"], people: ["Swapnil"], reasons: ["v2 priorities based on Arkade, NovaBrands, and TechFlow feedback after v1.0 launch"], topics: ["roadmap", "product", "v2"] } },
];

// ── Meeting Data ───────────────────────────────────────────────────────────────
export interface TranscriptSegment { speaker: string; speakerId: string; text: string; offsetMins: number; durationMins: number; }
export interface MeetingSeed {
  id: string; title: string; m: number; d: number; startHour: number;
  durationMins: number; type: string;
  segments: TranscriptSegment[];
  entities: SeedEntities;
}

export const MEETINGS: MeetingSeed[] = [
  {
    id: "mtg_001", title: "WEAVE Sprint 1 Planning", type: "planning",
    m: 1, d: 5, startHour: 10, durationMins: 60,
    entities: {
      is_relevant: true,
      decisions: ["Sprint 1 scope: AI generation pipeline, Next.js scaffold, Clerk auth, Neon DB setup", "Deliver working prototype by January 31 for Arkade beta", "Use GPT-4o with provider abstraction", "Zustand for frontend state management"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["Sprint 1 must deliver a demoable product before Arkade Studio beta kickoff on January 28"],
      topics: ["sprint-planning", "scope", "tech-stack"],
    },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 3,
        text: "Alright, let's plan sprint 1. I want to be really specific about what we're committing to versus what's aspirational. We have 4 weeks. The non-negotiable: working AI generation. Someone can type a prompt, hit generate, and see slides come back. That's the demo we need for Arkade on January 28. Everything else is secondary." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 3, durationMins: 2,
        text: "Agreed. From the frontend side — I can have the Next.js scaffold, Clerk auth, and basic slide rendering done in the first week. The editor interactions like drag-to-reorder and inline editing, that's week 2. Week 3 should be integration — wiring the AI generation API to the frontend. Week 4 is polish and bug fixing before the Arkade demo." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 5, durationMins: 2,
        text: "One thing I want to flag: Arkade specifically mentioned PPT export as a requirement. They don't just want to see slides in the browser — they need to download a PPT file. So export has to be in sprint 1 scope, not sprint 2." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 3,
        text: "That's a fair point. Okay, let me revise the priorities. Week 1: backend scaffold, Neon DB, Prisma schema, Clerk auth webhooks. Week 2: AI generation service — GPT-4o integration, streaming via SSE. Week 3: frontend integration, basic editor, PPT export via pptxgenjs. Week 4: Arkade demo prep, fix whatever's broken. Export will be basic quality for now, we'll improve it in sprint 2." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 10, durationMins: 2,
        text: "On state management — I evaluated Zustand vs Redux last night. For our use case it's Zustand, no question. We don't have complex cross-component state. The main state is: which presentation is active, which slide is selected, edit mode on/off, and undo history. Zustand handles this with like 50 lines of code." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 12, durationMins: 1,
        text: "Locked. Zustand it is." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 13, durationMins: 3,
        text: "For the templates — I know we said 1 generic template for sprint 1. But can we at least have a 'Pitch Deck' and a 'Product Update' template? That's literally all Arkade will want to test. I can write the template definitions — I just need Sumit to tell me the data format so I can write them as JSON." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 16, durationMins: 2,
        text: "Yes, two templates is fine. The template is just a system prompt modifier plus a default slide structure suggestion. I'll share the template schema by end of day. Swapnil you write the content, Ayush you wire up the template picker UI. Deal?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 18, durationMins: 1,
        text: "Deal. Should take me half a day once I have the schema." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 19, durationMins: 2,
        text: "One more thing: I'm going to abstract the AI model behind a provider interface. Not over-engineering — it's like 50 extra lines and it means if we need to swap GPT-4o for Claude we don't touch application code. I'll do this from day 1 in the AI service." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 21, durationMins: 1,
        text: "Smart. Okay, we're aligned. Sprint 1 committed items: backend scaffold, AI generation with streaming, frontend with 2 templates, PPT export, Clerk auth. Target: demoable by Jan 28." },
    ],
  },

  {
    id: "mtg_002", title: "Daily Standup — Jan 6", type: "standup",
    m: 1, d: 6, startHour: 9, durationMins: 15,
    entities: { is_relevant: false, decisions: [], people: ["Sumit", "Ayush", "Swapnil"], reasons: [], topics: ["standup"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "Good morning. Quick standup. Yesterday I got the Railway deployment pipeline running, Neon DB connected, Prisma schema v1 done. Users table, presentations table with JSONB for slide data, generations table for rate limiting. Today I'm starting the GPT-4o integration. No blockers." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 2,
        text: "Yesterday I scaffolded the Next.js app, dark mode working, Clerk auth integration done — login with Google works. Today I'm starting the slide canvas component. One thing I noticed: Clerk's user sync webhook needs to be set up so we can create records in our own DB when a new user signs up. Sumit, can you add the webhook endpoint today?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 4, durationMins: 1,
        text: "Yes, I'll add it this morning, should take 20 minutes." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 5, durationMins: 3,
        text: "Yesterday I finished the competitive analysis doc and the product requirements v1. I'm sharing it in the Google Drive now. Today I'm writing the template definitions for Pitch Deck and Product Update. Also sent Rohan at Arkade Studio a message — they're excited about the Jan 28 beta demo. He mentioned they want to show it to their whole team, so it has to work reliably, not just demo mode." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 8, durationMins: 2,
        text: "Noted. Let's keep a 'demo mode' in mind — meaning error states need to be graceful. If GPT-4o fails, we show a retry button, not a stack trace. Ayush, can you make sure error handling is built into the streaming component from day 1?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 10, durationMins: 2,
        text: "Absolutely. I'll build the error UI alongside the generation UI. Are we doing a loading skeleton while slides are generating? Like a placeholder card that fills in as each slide arrives?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 12, durationMins: 1,
        text: "Yes, skeleton cards. Classic pattern. Alright, let's go build." },
    ],
  },

  {
    id: "mtg_003", title: "Daily Standup — Jan 13", type: "standup",
    m: 1, d: 13, startHour: 9, durationMins: 15,
    entities: { is_relevant: true, decisions: ["Upgrade Railway to paid plan due to RAM limits during parallel generation"], people: ["Sumit", "Ayush", "Swapnil"], reasons: ["Free tier 512MB RAM insufficient for parallel GPT-4o calls"], topics: ["standup", "infra"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 3,
        text: "Morning. Good news and a small issue. Good news: GPT-4o integration is done. Slide generation works end-to-end. I typed 'Series A pitch for a B2B SaaS company' and got back 10 slides in 18 seconds. The quality is actually pretty good. The issue: I'm not doing parallel generation yet — it's sequential. Each slide waits for the previous one to finish. That's why it's 18 seconds. I'll switch to Promise.all() today." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 3, durationMins: 2,
        text: "18 seconds is too slow but I can already see the streaming will help a lot. Even at 18 seconds if the first slide appears in 2 seconds the user doesn't feel the wait as much. Good progress. My update: slide canvas is working, I can render the generated JSON to actual slides. Drag-to-reorder is 80% done, just need to fix the drop zone indicator." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 5, durationMins: 2,
        text: "Template definitions are done and shared in the Drive. Sumit, I formatted them as the JSON schema you gave me. One thing: can the Pitch Deck template automatically add a 'Thank You / Questions' slide at the end? Arkade mentioned that's something Gamma doesn't do and they always add it manually." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 1,
        text: "Easy, I'll add it as a template instruction." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 8, durationMins: 3,
        text: "One more thing — I hit the Railway free tier RAM limit yesterday. Parallel generation fires 10 GPT-4o calls simultaneously and that plus the Node.js overhead exceeded 512MB. I upgraded to Railway's paid tier at $12/month. We needed to do this eventually anyway. Swapnil, adding $12/month to the infra budget." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 11, durationMins: 1,
        text: "Fine. Expected. Okay, anything blocking the Arkade demo on the 28th?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 12, durationMins: 1,
        text: "Not yet. PPT export is the last piece, starting that today after the parallel gen fix." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 13, durationMins: 2,
        text: "I'll have the theme switcher done today. That's important for the demo — Rohan will want to see the brand customization capability even if the full brand kit isn't built yet." },
    ],
  },

  {
    id: "mtg_004", title: "Arkade Studio — Beta Kickoff Call", type: "client_sync",
    m: 1, d: 28, startHour: 14, durationMins: 30,
    entities: {
      is_relevant: true,
      decisions: ["Arkade Studio officially starting WEAVE beta", "Sumit to ship brand kit by Feb 14 based on Arkade feedback", "PPT pixel-perfect export confirmed working"],
      people: ["Sumit", "Swapnil", "Rohan"],
      reasons: ["Arkade is the first beta client, their feedback will shape sprint 2 priorities"],
      topics: ["client", "beta", "feedback"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 1,
        text: "Thanks for joining Rohan. Excited to officially kick off your beta access today. Quick agenda: we'll walk through the current capabilities, then do a live generation demo, then talk about your feedback process for the next 8 weeks." },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 1, durationMins: 2,
        text: "Thanks, excited to test this properly. We've already played around a bit and first impressions are really positive. The speed is noticeably different from Gamma. What I want to test today is the PPT export — that was literally our biggest pain point with Gamma. Formatting would break every time when clients opened it in PowerPoint." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 3, durationMins: 3,
        text: "Let me show you the export live. I'm generating a 10-slide deck right now — 'Pitch deck for a D2C skincare brand targeting Gen Z'. Watch the streaming... okay, slides 1 through 8 are done, waiting on 9 and 10... there we go, full deck in 5.2 seconds. Now I'll hit Export PPT. Downloaded. Let me open it in PowerPoint... as you can see, every slide is exactly what the browser showed. Fonts, colors, layout — all preserved. This is because we render to PNG first, then embed in the PPT." },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 6, durationMins: 2,
        text: "That's very clean. One question: can I edit the slides in PowerPoint after downloading? Or are they image-based?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 8, durationMins: 2,
        text: "Currently image-based, which gives you the pixel-perfect quality. Fully editable PPT is on our roadmap but it's technically harder because translating CSS layouts to PPTX shapes loses quality. For now you edit in WEAVE, then export. Does that work for your workflow?" },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 10, durationMins: 2,
        text: "It works for 80% of our cases. The remaining 20% is when clients want to make tweaks themselves in PowerPoint. But that's fine as a starting point." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 12, durationMins: 1,
        text: "Noted. That's going in the roadmap for v1.1. What else are you looking forward to testing?" },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 13, durationMins: 3,
        text: "The big one is brand kit. We work with 6-8 clients at a time, each with their own brand colors, logos. Right now we generate in WEAVE and then spend 30-45 minutes per deck reapplying brand stuff. If I can save a brand preset per client and have it auto-apply, that cuts our workflow in half. When is that coming?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 16, durationMins: 2,
        text: "February 14th. That's our commit date. Colors, logo, auto-apply on generation. We'll also add the ability to switch between brand kits so you can have one per client." },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 18, durationMins: 1,
        text: "That's exactly what we need. Perfect." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 19, durationMins: 3,
        text: "Great. For the feedback process: we'd love a written report at week 2, week 4, and week 8. Just a few paragraphs on what's working, what isn't, and what you wish existed. We'll also schedule a 30-minute call at each of those checkpoints. In exchange you get free access through March 31 and priority consideration for any feature requests you make. Sound good?" },
      { speaker: "Rohan", speakerId: "U_EXT_ROHAN", offsetMins: 22, durationMins: 1,
        text: "That's a great deal. Yes, absolutely." },
    ],
  },

  {
    id: "mtg_005", title: "Sprint 2 Planning", type: "planning",
    m: 2, d: 2, startHour: 10, durationMins: 60,
    entities: {
      is_relevant: true,
      decisions: ["Sprint 2: brand kit, 3 new templates, PDF export, share links", "Real-time collaboration deferred to v2", "Rate limiting in Postgres not Redis for sprint 2"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["Brand kit is Arkade's top request, PDF export and share links are quick wins, collaboration too complex for one sprint"],
      topics: ["sprint-planning", "scope"],
    },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "Sprint 1 wrap: we shipped everything committed. Generation works, streaming is live, PPT export is working, Clerk auth is solid. Velocity was 76 out of 80 story points. The 4 we missed were mobile responsiveness — consciously deferred. Sprint 1 done. Let's plan sprint 2." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 2, durationMins: 3,
        text: "My priority list from the Arkade feedback: number one is brand kit. Rohan is manually applying brand colors to every deck, it's killing their workflow. This is the highest leverage thing we can build in sprint 2. Second: more templates. They specifically asked for Pitch Deck — we technically have one but it's generic. We need a proper 3-act pitch narrative. Third: I've been getting questions from other potential customers about PDF export. Apparently some people prefer PDF over PPT. That's probably a quick win." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 5, durationMins: 3,
        text: "Brand kit: 1 week of backend work. Sumit (me) builds the storage and API, Ayush builds the UI. PDF export is actually already 80% done because we're using Puppeteer for PPT — PDF is just a different output format. Maybe 2 days total. Share links: I estimate 3 days — signed URL generation, public endpoint, view-only React page." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 8, durationMins: 3,
        text: "The brand kit UI will be interesting. I'm thinking a settings panel with a color picker for the 5 brand colors and a logo upload. The tricky part is making the colors apply in real-time in the editor — the slide canvas uses CSS variables, so I just need to update the CSS variable values when brand colors change. Should be smooth. One concern: font upload. Swapnil mentioned clients want custom fonts eventually. I want to scope that OUT for sprint 2 — it requires serving custom font files and loading them at runtime, which is a separate system." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 11, durationMins: 2,
        text: "Confirmed — custom fonts are not sprint 2. I already talked to Rohan and he's fine with brand colors + logo for now. Custom fonts are on the roadmap but not blocking the beta." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 13, durationMins: 2,
        text: "What about collaboration? I've had two people ask about real-time editing on calls this week. Are we putting any collaboration in sprint 2?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 15, durationMins: 3,
        text: "I don't think we should. Real-time collaboration means CRDT or OT, which is a 4-6 week project on its own. We'd basically stop everything else to build it. Share links — view only — is the right compromise. People can share for review, they just can't co-edit. That covers 70% of the collaboration use case without the complexity." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 18, durationMins: 1,
        text: "I checked with Arkade — they just need to share with clients for review, not co-edit. View-only links are perfect." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 19, durationMins: 2,
        text: "Decision: real-time collaboration is NOT sprint 2. Share links are. That's logged. Let me also raise rate limiting — right now we have no limits on generations. A free user could generate 500 decks and cost us $40. I need to ship rate limiting in sprint 2. Plan: 10 generations/month for free users, tracked in Postgres. No Redis yet — our query rate is low enough that Postgres can handle the counter updates." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 21, durationMins: 2,
        text: "Rate limit UX — important that it doesn't just return an error. User should see 'You've used 8 of 10 generations this month. Upgrade to Pro for unlimited.' That requires a generations counter on the frontend. Sumit, if you expose a /usage endpoint I can wire it up in the header." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 23, durationMins: 1,
        text: "Done, I'll add that endpoint. Sprint 2 locked: brand kit, 3 templates, PDF export, share links, rate limiting. 4 weeks, velocity target 80. Go." },
    ],
  },

  {
    id: "mtg_006", title: "Daily Standup — Feb 10", type: "standup",
    m: 2, d: 10, startHour: 9, durationMins: 15,
    entities: { is_relevant: false, decisions: [], people: ["Sumit", "Ayush", "Swapnil"], reasons: [], topics: ["standup"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "Morning. Yesterday finished rate limiting — 10 gen/month free users, tracked in Postgres, working in staging. Also started the brand kit API — storage is sorted, now working on the auto-apply logic. Today: brand kit API, target done by EOD." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 2,
        text: "Yesterday I built the color picker component and the brand kit settings panel. The CSS variable approach is working great — colors update in real-time in the editor as you drag the picker. The logo upload is 50% done. Today: finish logo upload, wire up the API endpoints Sumit is building." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 4, durationMins: 3,
        text: "Yesterday worked with Vikram on the 3 new templates — Pitch Deck structure is great, I think it's genuinely better than Gamma's default. Product Update is done too. Investor Update is 80% done. Also: NovaBrands inquiry came in yesterday. They're a brand agency, 12 users, want enterprise features — white-label, SSO, custom domain. I'm scoping an enterprise tier proposal. Sumit, how long would white-labeling take?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 2,
        text: "White-labeling is mostly config and CSS variable replacement for the logo. Maybe 2-3 days of work. SAML SSO is the harder part — passport-saml integration, tested with Okta. I'd estimate a week including testing. Custom domain is DNS config + SSL, half a day. If NovaBrands is serious, we can build this in sprint 3." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 9, durationMins: 2,
        text: "They signed the contract discussion yesterday. I think they're very serious. I'll send a proposal today. Any blockers anyone?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 11, durationMins: 1,
        text: "No blockers. Oh, one thing: the Puppeteer export on Railway is slow — 800ms per slide. 10 slides is 8 seconds just for export. Not urgent since generation is the user-facing latency, but export UX needs improvement before NovaBrands who'll be exporting 30-slide decks." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 12, durationMins: 3,
        text: "I'm thinking Lambda for Puppeteer. Move the render function to a Lambda — isolates the heavy process, runs parallel, and Lambda's execution environment is actually faster for headless Chrome than Railway's container. Cold start is 800ms but that's still faster than the 8 seconds on Railway for 10 slides. Will investigate next week." },
    ],
  },

  {
    id: "mtg_007", title: "Design Review — Slide Editor & Brand Kit", type: "design_review",
    m: 2, d: 16, startHour: 14, durationMins: 45,
    entities: {
      is_relevant: true,
      decisions: ["Slide typography defaults: title 44px, subtitle 28px, body 22px", "Brand kit ships with colors + logo only, custom fonts deferred", "Ocean theme contrast must pass WCAG AA before launch"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["Arkade beta feedback on font sizes being too small for projectors, accessibility compliance required"],
      topics: ["design", "accessibility", "brand-kit"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 2,
        text: "Let me pull up the design review agenda. We have three things to go through: typography defaults, brand kit UI, and the Ocean theme contrast issue Ayush flagged. Let's start with typography because that's the most urgent — Arkade reported the font sizes are too small on projectors." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 3,
        text: "I did some research on presentation typography standards. The generally accepted guideline is: title at 36-44px equivalent, body at 20-24px. Gamma uses 32px title and 18px body — we tested this on a projector and it's borderline readable at 5 meters. I'm proposing: title 44px, subtitle 28px, body 22px, caption 16px. These match the upper end of the standard, which makes WEAVE feel bolder and more professional by default." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 5, durationMins: 2,
        text: "I love this. 44px titles will make the slides feel substantial and premium. One question: do these sizes scale correctly when there are a lot of bullets on a slide? Like if someone has 8 bullets, they don't want them all at 22px." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 7, durationMins: 2,
        text: "Good point. I'm going to add auto-sizing: if a slide has more than 5 bullets, font size scales down to 18px. More than 8, scales to 14px. The AI generation prompt already tells GPT-4o to keep bullets to 5 max — but for user-added content we need the safety net." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 9, durationMins: 1,
        text: "Makes sense. Typography defaults locked: 44/28/22/16. Ship this today — Arkade is actively using WEAVE and this will directly improve their experience." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 10, durationMins: 2,
        text: "Brand kit UI. Ayush, walk us through what's built." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 12, durationMins: 4,
        text: "The brand kit settings panel has: a color picker for each of the 5 brand colors — primary, secondary, accent, background, text. You set them once, and every new deck generated uses those colors. The logo upload accepts PNG and SVG. SVG is important because logos at 1x look fine but on a high-res screen PNG logos can look blurry. The logo auto-places in the corner of every slide. When you switch themes, the theme's color scheme is overridden by the brand kit colors. That last part was a bit tricky to implement because themes set CSS custom properties and brand kit also sets them — I had to make sure brand kit has higher specificity." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 16, durationMins: 2,
        text: "The override logic is critical. One of Arkade's pain points with Gamma was that changing the theme would wipe their manual color edits. If WEAVE respects brand kit even when the theme changes, that's a key differentiator. Can you demo that live?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 18, durationMins: 3,
        text: "Yes — watch. I've set Arkade's blue as the primary color. Now I switch from Minimal theme to Ocean theme... you can see the primary brand blue is preserved even though Ocean normally has a different primary. The theme background and accent change, but the brand primary stays locked. That's exactly the behavior we want." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 21, durationMins: 1,
        text: "Nice. Ship it." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 22, durationMins: 2,
        text: "Last item: Ocean theme contrast. Ayush, what did axe DevTools find?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 24, durationMins: 3,
        text: "The Ocean theme uses a deep teal background with a slightly lighter teal for body text. The contrast ratio is 3.2:1. WCAG AA requires 4.5:1 for normal text. So we fail. The fix is to lighten the body text color to near-white for Ocean theme — the contrast then goes to 7.1:1 which passes AAA. I can fix this in 30 minutes. The question is: do we care about WCAG compliance for all themes, or just Ocean?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 27, durationMins: 2,
        text: "We should care for all themes — NovaBrands probably has enterprise clients who will flag accessibility issues. Let's run the full audit on all 6 themes and fix anything failing. Ship this before NovaBrands onboarding." },
    ],
  },

  {
    id: "mtg_008", title: "Daily Standup — Feb 24", type: "standup",
    m: 2, d: 24, startHour: 9, durationMins: 15,
    entities: { is_relevant: false, decisions: [], people: ["Sumit", "Ayush", "Swapnil"], reasons: [], topics: ["standup"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "Yesterday shipped share links — the API generates a signed JWT URL, the public viewer page renders the deck read-only. Works well. Also started the Lambda investigation for Puppeteer export. Today: Lambda Puppeteer POC." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 2,
        text: "Yesterday: all 6 themes pass WCAG AA now, brand kit shipped to production, Arkade is testing it. The feedback so far is very positive. Today: mobile responsiveness pass — not a sprint goal but want to do a best-effort pass before NovaBrands who might use iPads." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 4, durationMins: 3,
        text: "Yesterday: NovaBrands contract fully signed, payment received, pilot starts March 10. Vikram finished all 9 templates — they look genuinely great. The QBR template is particularly good. Also heard from a third prospect this week — TechFlow, found us through Arkade referral. Demo scheduled for March 19. This is starting to feel like word-of-mouth is working." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 1,
        text: "That's great on NovaBrands. The referral from Arkade is huge — means the product is working." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 8, durationMins: 2,
        text: "One thing on NovaBrands — Swapnil mentioned they need SSO working before any team member logs in. We need to make sure the Okta SAML integration is thoroughly tested. Sumit, when will you start on that?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 10, durationMins: 2,
        text: "Starting next week, first week of March. I've done passport-saml before at a previous job. Okta is the most standard SAML IdP so it should be clean. I'll set up a test Okta tenant to develop against. Target: SSO live by March 7." },
    ],
  },

  {
    id: "mtg_009", title: "Sprint 3 Planning", type: "planning",
    m: 3, d: 2, startHour: 10, durationMins: 60,
    entities: {
      is_relevant: true,
      decisions: ["Sprint 3 goals: NovaBrands onboarding, SSO, white-label, feature freeze March 15, launch March 31", "Lambda Puppeteer for export performance", "Monitoring: Sentry + Axiom before launch"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["NovaBrands requires SSO before onboarding, feature freeze needed to hit March 31 launch"],
      topics: ["sprint-planning", "enterprise", "launch"],
    },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 3,
        text: "Sprint 2 retrospective quick: brand kit shipped, templates done (9 total), PDF export working, share links live, rate limiting live. We hit 82 of 80 story points — basically full velocity plus a bit extra because the PDF export was faster than estimated. Sprint 3 is our last sprint before launch. March 31 is the hard date. Let's be realistic about what we can ship." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 3, durationMins: 3,
        text: "Top priorities from a business standpoint: NovaBrands needs to be fully onboarded by March 10. That means SSO, white-label, and custom domain all working. Beyond NovaBrands, I want to make sure the public launch is ready — landing page needs to be sharp, the onboarding flow needs to be smooth for self-serve users. We're getting inbounds now and I don't want to lose them to a confusing sign-up experience." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 6, durationMins: 3,
        text: "Landing page redesign — I have a plan. Instead of a static hero screenshot, I want to embed a live WEAVE demo in the hero. User types a topic, sees 3 slides generate in real-time. This is the most convincing demo for what we do. I've seen data that interactive demos convert at 4x the rate of screenshots. Can I prioritize this?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 9, durationMins: 1,
        text: "Yes. That's a great idea and it reuses our existing streaming infrastructure. How long?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 10, durationMins: 1,
        text: "3 days. It's mostly a UI component wrapping the existing API." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 11, durationMins: 3,
        text: "Okay. Here's my sprint 3 list: Lambda Puppeteer for export (done by March 5), SAML SSO for NovaBrands (done by March 7), white-label config system (March 9), monitoring setup — Sentry + Axiom — before launch. DB indexes before launch. Security audit of the SAML flow. Feature freeze March 15, bug fixing only after that." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 14, durationMins: 2,
        text: "On feature freeze — I want to formally propose calling it on March 15. That gives us 16 days of QA and bug fixing before March 31. No new features after the 15th, only bug fixes and performance. Are we both aligned?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 16, durationMins: 2,
        text: "Fully aligned. I've been saying this for 2 weeks. The scope creep has been manageable but I want to stop it before the launch sprint. 16 days of QA is the right call." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 18, durationMins: 2,
        text: "Agreed. Feature freeze March 15. One exception: if NovaBrands reports a critical bug that blocks their workflow, we fix it even after the freeze. That's non-negotiable since they're paying customers. But new features — no." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 20, durationMins: 2,
        text: "Fair exception. One more thing — do we have monitoring in place? If we launch on March 31 and something breaks at 2am, how do we know? We need alerts." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 22, durationMins: 3,
        text: "I'm setting up Sentry for error tracking and Axiom for logs this week. I'll configure alerts for: p95 generation latency over 15 seconds, error rate over 2%, DB connection failures, and Lambda timeout rate over 5%. These are the things that would break the core product. Railway already has an uptime check on the /health endpoint. That should give us enough visibility for launch." },
    ],
  },

  {
    id: "mtg_010", title: "NovaBrands Client Sync — Week 1 Review", type: "client_sync",
    m: 3, d: 17, startHour: 14, durationMins: 30,
    entities: {
      is_relevant: true,
      decisions: ["Add speaker notes depth setting (brief/standard/detailed) in 2 weeks", "Add executive summary as optional first slide type", "Custom fonts deferred to v2, offer theme font options as interim solution"],
      people: ["Sumit", "Swapnil", "Priya Kapoor"],
      reasons: ["NovaBrands QBR decks need detailed speaker notes for briefed presenters, exec summary is a standard QBR requirement"],
      topics: ["client", "enterprise", "feedback", "roadmap"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 1,
        text: "Thanks for joining Priya. Week 1 with the full NovaBrands team. We've read your written feedback — really useful. Let's go through each item together." },
      { speaker: "Priya Kapoor", speakerId: "U_EXT_PRIYA", offsetMins: 1, durationMins: 3,
        text: "Sure. Overall the team's reaction has been positive — the generation quality for structured QBR content is genuinely good. The SSO via Okta is working perfectly, which removes a big friction point. The white-label looks clean. The main issues are three things, and I'll be direct about them. Speaker notes are too shallow — they're one-liners. When our team presents to enterprise clients, the presenter is often not the author of the deck. They need proper briefing notes, 3-4 sentences per slide at least. Right now WEAVE gives me things like 'Revenue grew 23% YoY' — that's a data point, not a speaker note." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 4, durationMins: 1,
        text: "That's really clear feedback. Sumit, what's the fix?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 5, durationMins: 2,
        text: "The speaker notes length and depth is a prompt instruction change plus a settings option. I can add a 'Speaker notes style' setting: brief, standard, detailed. Detailed mode prompts GPT-4o to write full narrative sentences explaining the context and talking points for each slide. Two weeks to ship." },
      { speaker: "Priya Kapoor", speakerId: "U_EXT_PRIYA", offsetMins: 7, durationMins: 2,
        text: "Perfect. The second item: executive summary. Every QBR we produce starts with a one-page exec summary — three to five bullet points covering the key messages of the entire deck. Our clients expect this. Can WEAVE auto-generate it based on the rest of the slides?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 9, durationMins: 2,
        text: "Yes. I can add this as an optional slide type — 'Executive Summary' — that uses the generated outline to create a summary slide. It would be the first slide in the deck when selected. This is actually interesting technically because it's a meta-generation step that runs after the outline is built. Adding it to the current sprint, shouldn't take more than a week." },
      { speaker: "Priya Kapoor", speakerId: "U_EXT_PRIYA", offsetMins: 11, durationMins: 3,
        text: "That's great. The third item is the hardest one. Brand compliance. We have clients — large FMCG companies — where the brand guidelines are extremely specific. Not just colors, but fonts. One client uses Aktiv Grotesk as their heading font, another uses Canela. The theme system in WEAVE only lets me choose from 4-5 system fonts. For those clients, the decks don't match their brand standards and we'd need to manually re-do the headings in PowerPoint after export. That defeats the purpose." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 14, durationMins: 1,
        text: "Sumit, where are we on custom font support?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 15, durationMins: 3,
        text: "Custom font upload is not in v1.0 — it requires loading fonts at runtime via @font-face injection and making sure those fonts are available during Puppeteer rendering, which is a separate system. I'm estimating 3-4 weeks to do properly. It's going on our v2 roadmap as a priority. For the pilot period, the best I can offer is expanding the theme font options — I can add Aktiv Grotesk and a few other common brand fonts as built-in options if you can tell me which ones your clients use most commonly." },
      { speaker: "Priya Kapoor", speakerId: "U_EXT_PRIYA", offsetMins: 18, durationMins: 2,
        text: "I can send a list of the top 5 fonts across our client base. If you can include even those 5 as built-in options, that covers probably 60% of our brand compliance requirement. The other 40% we'd still need to adjust manually. It's not ideal but it's workable for the pilot." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 20, durationMins: 2,
        text: "That's a reasonable interim. Sumit, can we add the top 5 client fonts as theme options before end of March?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 22, durationMins: 1,
        text: "If Priya sends the font names and they're available on Google Fonts or have free licenses, yes. If they're proprietary, it depends on licensing." },
      { speaker: "Priya Kapoor", speakerId: "U_EXT_PRIYA", offsetMins: 23, durationMins: 2,
        text: "I'll check the font licenses this week and send you a list by Friday. At least 3 of the 5 should be free fonts. Thank you both — this was a productive call. The product is genuinely useful, these are polish items, not fundamental problems." },
    ],
  },

  {
    id: "mtg_011", title: "Daily Standup — Mar 10", type: "standup",
    m: 3, d: 10, startHour: 9, durationMins: 15,
    entities: { is_relevant: false, decisions: [], people: ["Sumit", "Ayush", "Swapnil"], reasons: [], topics: ["standup"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "Morning. Big milestone — NovaBrands SSO is live and all 12 users are onboarded. White-label is live, their subdomain is working. Had one SAML hiccup where Okta's assertion format didn't match our SP config — spent 3 hours debugging but it's sorted now. Today: DB indexes and monitoring setup." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 2,
        text: "Live demo on landing page is 80% done — the generation streams correctly, slides render in the hero. Today finishing the last slide card animation and the CTA below the demo. Also accessibility fixes from the audit — keyboard nav on the canvas is done, Ocean theme contrast fixed." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 4, durationMins: 3,
        text: "NovaBrands onboarding call went really well this morning. The team is up and running. Priya sent the font list already — 3 are Google Fonts, 2 are proprietary. Sumit, I'll forward the email. TechFlow trial is active — Ananya and her co-founder logged in yesterday and already generated 4 decks. Very fast adoption. And I'm writing the launch blog post today — what angle should we take? 'We built a faster Gamma' feels too narrow." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 7, durationMins: 2,
        text: "I'd position it as 'presentation generation that actually exports correctly'. The export quality is our biggest differentiator vs Gamma. Every person who's tried WEAVE mentions the PPT export first. Lead with that problem — everyone's had the experience of a beautiful deck falling apart in PowerPoint." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 9, durationMins: 1,
        text: "Love it. 'We built WEAVE because we were tired of beautiful decks breaking in PowerPoint.' That's the hook." },
    ],
  },

  {
    id: "mtg_012", title: "Sprint Retrospective — Sprint 2", type: "retrospective",
    m: 2, d: 27, startHour: 16, durationMins: 45,
    entities: {
      is_relevant: true,
      decisions: ["Add explicit scope discussion at start of each sprint to prevent mid-sprint additions", "Create a WEAVE RFC document for significant technical decisions", "Dedicate last 2 days of each sprint purely to testing"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["Mid-sprint scope additions caused stress in sprint 2, RFC process prevents costly late-stage design changes"],
      topics: ["retrospective", "process", "team"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 1,
        text: "Sprint 2 retro. Let's be honest about what went well and what didn't. Start with went well." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 1, durationMins: 2,
        text: "Velocity was good — 82 points. Brand kit shipped on time and it's clearly the right feature based on Arkade feedback. The parallel generation architecture we did in sprint 1 kept paying dividends this sprint — the Lambda investigation showed it scales well." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 3, durationMins: 2,
        text: "The templates turned out really well. Vikram did great work. The design quality of the 9 templates is noticeably better than what we had before. Also the CSS variable approach for theming and brand kit is a clean architecture — no tech debt created there." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 5, durationMins: 2,
        text: "NovaBrands signing is obviously the big win. That came faster than expected and it validates the enterprise angle. Referral from Arkade to TechFlow — that's our first word-of-mouth lead. Product is working." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 2,
        text: "What didn't go well: mid-sprint the NovaBrands enterprise requirements came in and I started context-switching to estimate that work while also finishing sprint 2 features. That was stressful. We need a better process for handling inbound enterprise requirements — they shouldn't disrupt in-flight sprint work." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 9, durationMins: 2,
        text: "Agreed. Also: I think we need to be more explicit at sprint planning about what's explicitly OUT of scope. We had a few Slack discussions mid-sprint about adding features — collaboration, mobile editing — that kept re-opening debates we'd already had. Writing 'NOT IN SPRINT 2' explicitly in the planning notes would save that." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 11, durationMins: 2,
        text: "The Lambda investigation is something I want to flag. Sumit started it mid-sprint because the Puppeteer performance issue became urgent when NovaBrands' 30-slide requirement emerged. But it wasn't in the sprint plan. How do we handle urgent technical discoveries?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 13, durationMins: 3,
        text: "I think the Lambda work was the right call even mid-sprint — it was blocking a paying client's use case. But the lesson is: I should have flagged it in standup immediately when I started it, not worked on it silently for a day and a half. Transparency about scope changes is the fix, not avoiding the change itself." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 16, durationMins: 2,
        text: "One process thing I want to propose: RFC document for significant technical decisions. Before making a major architecture change — like moving Puppeteer to Lambda, or the brand kit CSS variable approach — write a one-pager: problem, options, decision, trade-offs. Even if we only spend 30 minutes on it, it prevents the 'wait why did we do it this way' conversations 3 weeks later." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 18, durationMins: 1,
        text: "That's exactly what I've been missing as product. When I find out about a technical decision 2 weeks after it was made, I can't give input on product trade-offs. RFC process means I'm in the loop before decisions are locked." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 19, durationMins: 2,
        text: "Agreed. Starting sprint 3 I'll create a /docs/rfcs folder in the repo. Any architectural decision — model changes, infra changes, data model changes — gets an RFC. Quick async review, then decision." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 21, durationMins: 2,
        text: "Last thing: testing. We ship features without enough QA time at the end of the sprint. I know we're moving fast but we've shipped bugs to Arkade twice now. Can we protect the last 2 days of each sprint as testing-only? No new features." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 23, durationMins: 1,
        text: "Yes. The last 2 days: regression testing on Arkade + NovaBrands workflows, edge cases, mobile check. I'll write the test checklist this week." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 24, durationMins: 1,
        text: "Agreed. Three action items from this retro: RFC process starting sprint 3, explicit 'not in scope' in planning notes, last 2 sprint days reserved for testing. Let's go." },
    ],
  },

  {
    id: "mtg_013", title: "Design Review — Launch Readiness", type: "design_review",
    m: 3, d: 19, startHour: 14, durationMins: 45,
    entities: {
      is_relevant: true,
      decisions: ["Ship v1.0 as desktop-optimized, document mobile limitations", "Landing page live hero demo is priority 1 this week", "Lighthouse score target 95+ before launch"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["Mobile editor not fixable in 12 days, hero demo is highest-conversion landing page element"],
      topics: ["launch", "design", "quality"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 2,
        text: "12 days to launch. Design review today — I want to go through the landing page, the onboarding flow, and the editor one more time with fresh eyes. Let me start with the landing page because it's the face of WEAVE for new users." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 4,
        text: "Live demo component is done and I want to show it. Type a topic — I'll type 'product update for a fintech app Q1 2026'. Watch the hero. First slide is appearing... second... within 5 seconds we have 3 slides visible in the hero canvas. The color, the typography, the layout — it looks premium. This is our hook. Every visitor sees the product working before they sign up. Conversion should be significantly higher than a screenshot or video." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 6, durationMins: 2,
        text: "This is genuinely impressive. The streaming animation — slides appearing one by one — is mesmerizing. We need this on launch day without fail. What's the reliability like? If it fails or times out, what does the user see?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 8, durationMins: 2,
        text: "If the generation fails — which is rare but possible — the UI shows a static fallback slide set with a 'Try in app →' CTA. The demo is limited to 3 slides and uses a simplified prompt, so it's faster and less likely to fail than a full generation. I also capped demo rate at 5 per minute per IP to prevent abuse." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 10, durationMins: 2,
        text: "Good defensive design. One concern: the demo generation still hits our OpenAI quota. If the landing page gets significant traffic on launch day, 1000 demo generations is $8 in OpenAI costs. Acceptable but let's monitor it." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 12, durationMins: 2,
        text: "Let me move to the onboarding flow. New user signs up, what do they see? Walk me through it." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 14, durationMins: 4,
        text: "Sign up with Google → Clerk handles auth → webhook fires → user created in our DB → redirect to dashboard. First visit: modal appears asking 'What will you use WEAVE for?' with 3 options: pitch decks, product presentations, client decks. Based on selection, we pre-populate a brand kit prompt and suggest a template. Then they land on the new presentation page with the prompt field pre-focused and a suggested prompt. We've reduced the time-to-first-generation to about 45 seconds from sign-up." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 18, durationMins: 2,
        text: "45 seconds time-to-value is excellent. The 3-option modal is smart — it segments users immediately and makes the first generation feel personalized. What about mobile? If someone clicks from a mobile browser?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 20, durationMins: 3,
        text: "The landing page is fully mobile responsive — Lighthouse mobile score is 91. The sign-up flow works on mobile. The editor is where it breaks — the slide canvas doesn't resize correctly on small screens, and the toolbar is cluttered. My recommendation: if a mobile user tries to access the editor, show a 'Best experienced on desktop' banner but still let them in. Don't block mobile users, just set expectations. We can fix mobile editor in v2." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 23, durationMins: 1,
        text: "Agreed. Desktop-optimized for v1.0. Not desktop-only, but optimized. Log it in the release notes." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 24, durationMins: 2,
        text: "Performance — Lighthouse scores? We need to be fast for launch because slow sites lose users in the first 3 seconds." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 26, durationMins: 2,
        text: "Landing page desktop: 98. Mobile: 91. Dashboard: 94 desktop. The editor is lower — 87 — because of the Framer Motion animations and the canvas rendering. I'm going to optimize it this week, targeting 92+. The LCP is 1.1 seconds on desktop which is green." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 28, durationMins: 2,
        text: "Target 95+ across all pages on desktop for launch. Mobile 85+ is acceptable. Set up Lighthouse CI in the pipeline — it should run on every deploy and fail the build if scores drop below threshold." },
    ],
  },

  {
    id: "mtg_014", title: "Daily Standup — Mar 24", type: "standup",
    m: 3, d: 24, startHour: 9, durationMins: 15,
    entities: { is_relevant: false, decisions: [], people: ["Sumit", "Ayush", "Swapnil"], reasons: [], topics: ["standup"] },
    segments: [
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 0, durationMins: 2,
        text: "7 days to launch. Yesterday: DB indexes done, Sentry and Axiom configured, all alert thresholds set. Production deploy dry run — went clean, no issues. Today: DNS verification, SSL cert check, final security scan on the SAML endpoint." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 2,
        text: "Yesterday: Lighthouse editor page is now 93, up from 87. WCAG AA passing across all pages. Final smoke test today on the production build — I'll run through the full user journey: sign up, onboard, generate, edit, export, share. If all 6 steps work cleanly, we're launch-ready from my end." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 4, durationMins: 3,
        text: "TechFlow demo on Friday was very good. Ananya loved the product. She's signing up for 3 Pro seats — I'll send the upgrade link today. Also the launch blog post is drafted. I want to do one more pass today. The hook is 'We built WEAVE because we were tired of beautiful decks breaking in PowerPoint.' Sumit, can you review the technical section where I describe the generation pipeline? Want to make sure it's accurate but not too jargon-heavy." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 7, durationMins: 1,
        text: "Send it my way today, I'll review by 3pm." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 8, durationMins: 2,
        text: "One thing: the share link on Safari desktop has a weird visual artifact — the slide background renders with a slight offset. I found it in QA yesterday. It's a Puppeteer/Safari CSS rendering difference. Fix: normalize the background rendering in the CSS before Puppeteer captures. I'll push this today." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 10, durationMins: 2,
        text: "Good catch. Safari edge cases are the worst. Get it in before the launch, post-launch Safari bugs look bad. Anything blocking launch that we haven't addressed?" },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 12, durationMins: 1,
        text: "No blockers. We're clean." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 13, durationMins: 2,
        text: "I feel good about March 31. Two paying clients live, a third converting, the product works. Let's ship it." },
    ],
  },

  {
    id: "mtg_015", title: "Final Sprint Retrospective & Launch Prep", type: "retrospective",
    m: 3, d: 30, startHour: 16, durationMins: 45,
    entities: {
      is_relevant: true,
      decisions: ["WEAVE v1.0 launches March 31", "Post-launch: weekly monitoring review every Monday for first month", "v2 roadmap kickoff April 7"],
      people: ["Sumit", "Ayush", "Swapnil"],
      reasons: ["v1.0 is feature-complete, 2 paying clients live, product market fit signal is clear"],
      topics: ["retrospective", "launch", "planning"],
    },
    segments: [
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 0, durationMins: 2,
        text: "Last retro before launch tomorrow. I want this to be both a reflection on the 3-month sprint and a look ahead. Let's start with what we built. Three months ago WEAVE didn't exist. Tomorrow we're launching with 2 paying clients, a pipeline of a third, and a product that genuinely works. That's remarkable." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 2, durationMins: 3,
        text: "From a technical standpoint, I'm genuinely proud of the architecture. The streaming generation, the brand kit CSS variable system, the Lambda export pipeline — these are not hacks, they're proper solutions. The codebase is clean enough that a new engineer could onboard in a day. That matters for when we hire." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 5, durationMins: 3,
        text: "The AI model abstraction turned out to be very smart. When OpenAI had that outage in February, the Claude fallback kicked in automatically and zero users noticed. The pipelining work — parallel generation, SSE streaming — that's what makes WEAVE feel fast. That's a core product differentiator now, not just an implementation detail. And the decision to use Neon with JSONB for presentations was right — the schema has been stable across all 3 months without a major migration." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 8, durationMins: 3,
        text: "From a product and business standpoint: Arkade Studio is our proof of concept. They were using Gamma + Figma, spending 6-8 hours per deck. With WEAVE they're at 1.5-2 hours. That's a 4x productivity improvement for an agency. NovaBrands gives us enterprise credibility. TechFlow is the first self-serve inbound convert — meaning word-of-mouth is starting to work. The fundamentals are right." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 11, durationMins: 2,
        text: "What didn't go as well: test coverage is at 35%. We committed to getting it to 60% and we didn't. The intern starting in April needs to focus on this as their first project. Also, mobile — we deferred it twice. By the time we ship v2, mobile must be first-class, not an afterthought." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 13, durationMins: 2,
        text: "I want to flag the Puppeteer/Safari bug that Ayush caught on March 24. That was found 7 days before launch. We need a defined QA process — running the full test matrix including Safari — at least 2 weeks before launch, not 1 week. That's a process gap we should fix for v2 launch." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 15, durationMins: 2,
        text: "Noted. Post-launch plan: for the first month, daily monitoring review at 9am standup — look at Sentry error counts, p95 latency from Axiom, and any user-reported issues. After month 1, drop to weekly. v2 planning kicks off April 7. Top priorities based on client feedback: custom fonts, detailed speaker notes, executive summary, and growing the template library." },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 17, durationMins: 2,
        text: "On the revenue side — we're launching with about $3k MRR: Arkade Pro 4 seats ($1,280), NovaBrands enterprise pilot (₹80k/month equivalent), TechFlow Pro 3 seats ($960). The target for end of Q2 is $15k MRR. That means adding roughly 50-60 Pro users or 2-3 more enterprise clients. Doable if the word-of-mouth and the launch blog post land well." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 19, durationMins: 2,
        text: "One more thing before we close: I want to appreciate the team dynamic. We've had disagreements — collaboration scope, mobile priority, export architecture — but we've always resolved them quickly and moved forward. No lingering resentment, no ego. That's not common and it's why we shipped in 3 months instead of 6. Good team." },
      { speaker: "Swapnil", speakerId: U_SWAPNIL, offsetMins: 21, durationMins: 2,
        text: "Agreed. Okay, last thing — tomorrow's launch plan. Blog post goes live at 10am. ProductHunt submission at 12pm. Sumit posts on LinkedIn, I post on Twitter. We monitor the #general channel all day for issues. If any P1 bug is reported, Sumit drops everything to fix it. Ayush is on standby for frontend issues. I'm handling all inbound messages. Ready?" },
      { speaker: "Sumit", speakerId: U_SUMIT, offsetMins: 23, durationMins: 1,
        text: "Ready." },
      { speaker: "Ayush", speakerId: U_AYUSH, offsetMins: 24, durationMins: 1,
        text: "Ready. Let's ship it." },
    ],
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("🌱  Farship / WEAVE seed starting…");

  // ── 1. Clear PostgreSQL (dependency order) ──────────────────────────────────
  console.log("\n[1/5] Clearing PostgreSQL…");
  await prisma.transcript.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.calendarConnection.deleteMany();
  await prisma.recallBotSettings.deleteMany();
  await prisma.ingestedDocument.deleteMany();
  await prisma.driveExtraction.deleteMany();
  await prisma.gmailMessage.deleteMany();
  await prisma.slackMessage.deleteMany();
  await prisma.integrationCredential.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ PostgreSQL cleared");

  // ── 2. Clear ChromaDB ───────────────────────────────────────────────────────
  console.log("\n[2/5] Clearing ChromaDB…");
  const chroma = new ChromaClient({ path: process.env.CHROMADB_URL ?? "http://localhost:8000" });
  try { await chroma.deleteCollection({ name: "zeta_knowledge" }); } catch { /* doesn't exist yet */ }
  const collection = await chroma.createCollection({ name: "zeta_knowledge" });
  console.log("  ✓ ChromaDB collection recreated");

  // ── 3. Clear Neo4j ──────────────────────────────────────────────────────────
  console.log("\n[3/5] Clearing Neo4j…");
  const neo4jDriver = neo4j.driver(
    process.env.NEO4J_URI ?? "bolt://localhost:7687",
    neo4j.auth.basic(process.env.NEO4J_USER ?? "neo4j", process.env.NEO4J_PASSWORD ?? "password"),
  );
  const neo4jSession = neo4jDriver.session();
  await neo4jSession.run("MATCH (n) DETACH DELETE n");
  console.log("  ✓ Neo4j cleared");

  // ── 4. Create Users & credentials ──────────────────────────────────────────
  console.log("\n[4/5] Creating users…");
  const USERS = [
    { auth0Sub: "auth0|farship_sumit",   email: "sumit@farship.io",   name: "Sumit",   picture: "https://ui-avatars.com/api/?name=Sumit&background=6366f1&color=fff" },
    { auth0Sub: "auth0|farship_ayush",   email: "ayush@farship.io",   name: "Ayush",   picture: "https://ui-avatars.com/api/?name=Ayush&background=10b981&color=fff" },
    { auth0Sub: "auth0|farship_swapnil", email: "swapnil@farship.io", name: "Swapnil", picture: "https://ui-avatars.com/api/?name=Swapnil&background=f59e0b&color=fff" },
  ];
  const createdUsers = await Promise.all(
    USERS.map((u) => prisma.user.create({ data: u })),
  );
  const [sumit, ayush, swapnil] = createdUsers;

  // Integration credentials — Google + Slack for each user
  for (const user of createdUsers) {
    await prisma.integrationCredential.create({
      data: {
        userId: user.id, provider: "google_workspace",
        providerEmail: user.email, providerScopes: "email,profile,https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/drive.readonly",
        accessTokenEnc: `enc_google_${user.name?.toLowerCase()}_access`,
        refreshTokenEnc: `enc_google_${user.name?.toLowerCase()}_refresh`,
        tokenExpiry: new Date(2026, 11, 31), isActive: true,
      },
    });
    await prisma.integrationCredential.create({
      data: {
        userId: user.id, provider: "slack",
        providerEmail: user.email, providerTeamId: TEAM_ID, providerTeamName: "Farship HQ",
        providerScopes: "channels:history,users:read,team:read",
        accessTokenEnc: `enc_slack_${user.name?.toLowerCase()}_access`,
        isActive: true,
      },
    });
  }

  // Calendar connections — one per user
  const calendarConnections: Record<string, string> = {};
  for (const user of createdUsers) {
    const cal = await prisma.calendarConnection.create({
      data: {
        userId: user.id,
        calendarId: `primary_${user.email}`,
        calendarEmail: user.email!,
        refreshTokenEnc: `enc_cal_${user.name?.toLowerCase()}_refresh`,
        platform: "google", isActive: true,
      },
    });
    calendarConnections[user.id] = cal.calendarId;
  }
  console.log("  ✓ 3 users, 6 integration credentials, 3 calendar connections");

  // ── 5. Seed content ─────────────────────────────────────────────────────────
  console.log("\n[5/5] Seeding content…");

  const chromaPayloads: SeedPayload[] = [];
  const neo4jPayloads: { payload: SeedPayload; entities: SeedEntities }[] = [];

  // Map slack user ID → DB user
  const slackUserToDb: Record<string, typeof sumit> = {
    [U_SUMIT]: sumit,
    [U_AYUSH]: ayush,
    [U_SWAPNIL]: swapnil,
  };
  const slackUserToName: Record<string, string> = {
    [U_SUMIT]: "Sumit",
    [U_AYUSH]: "Ayush",
    [U_SWAPNIL]: "Swapnil",
  };

  // ── Slack ─────────────────────────────────────────────────────────────────
  console.log("  → Slack messages…");
  for (const msg of SLACK_MESSAGES) {
    const ts = slackTs(msg.m, msg.d, msg.h, msg.min ?? 0);
    const dbUser = slackUserToDb[msg.slackUser];
    await prisma.slackMessage.create({
      data: {
        userId: dbUser.id,
        eventId: `evt_${msg.id}`,
        teamId: TEAM_ID,
        channelId: msg.ch,
        slackUserId: msg.slackUser,
        text: msg.text,
        ts,
        threadTs: msg.threadId ? slackTs(
          SLACK_MESSAGES.find((m) => m.id === msg.threadId)?.m ?? msg.m,
          SLACK_MESSAGES.find((m) => m.id === msg.threadId)?.d ?? msg.d,
          SLACK_MESSAGES.find((m) => m.id === msg.threadId)?.h ?? msg.h,
        ) : null,
        rawPayload: { id: msg.id, channel: msg.ch, user: msg.slackUser, text: msg.text, ts },
      },
    });

    const isoTs = isoDate(msg.m, msg.d, msg.h, msg.min ?? 0).toISOString();
    const channelName = { [C_GENERAL]: "general", [C_DEV]: "weave-dev", [C_DESIGN]: "design", [C_PRODUCT]: "product", [C_STANDUP]: "standup" }[msg.ch] ?? "general";
    await prisma.ingestedDocument.create({
      data: {
        sourceId: msg.id, sourceType: "slack",
        rawText: msg.text, author: slackUserToName[msg.slackUser],
        channel: channelName, timestamp: isoTs,
        isRelevant: msg.entities.is_relevant,
        decisions: msg.entities.decisions,
        people: msg.entities.people,
        topics: msg.entities.topics,
      },
    });

    const seedPayload: SeedPayload = {
      source_id: msg.id, source_type: "slack",
      raw_text: msg.text,
      metadata: { author: slackUserToName[msg.slackUser], timestamp: isoTs, channel: channelName },
    };
    chromaPayloads.push(seedPayload);
    if (msg.entities.is_relevant) neo4jPayloads.push({ payload: seedPayload, entities: msg.entities });
  }
  console.log(`    ✓ ${SLACK_MESSAGES.length} Slack messages`);

  // ── Gmail ─────────────────────────────────────────────────────────────────
  console.log("  → Gmail messages…");
  const gmailUserMap: Record<string, typeof sumit> = {
    "sumit@farship.io": sumit,
    "ayush@farship.io": ayush,
    "swapnil@farship.io": swapnil,
  };
  for (const email of GMAIL_MESSAGES) {
    const dbUser = gmailUserMap[email.from] ?? sumit;
    const dateStr = emailDate(email.m, email.d, email.h ?? 10);
    await prisma.gmailMessage.create({
      data: {
        userId: dbUser.id,
        gmailMessageId: email.id,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: dateStr,
        snippet: email.snippet,
        bodyText: email.body,
        labelIds: email.labels,
      },
    });

    const isoTs = isoDate(email.m, email.d, email.h ?? 10).toISOString();
    await prisma.ingestedDocument.create({
      data: {
        sourceId: email.id, sourceType: "gmail",
        rawText: `${email.subject}\n\n${email.body}`,
        author: email.from, subject: email.subject, timestamp: isoTs,
        isRelevant: email.entities.is_relevant,
        decisions: email.entities.decisions,
        people: email.entities.people,
        topics: email.entities.topics,
      },
    });

    const seedPayload: SeedPayload = {
      source_id: email.id, source_type: "gmail",
      raw_text: `${email.subject}\n\n${email.body}`,
      metadata: { author: email.from, timestamp: isoTs, subject: email.subject },
    };
    chromaPayloads.push(seedPayload);
    if (email.entities.is_relevant) neo4jPayloads.push({ payload: seedPayload, entities: email.entities });
  }
  console.log(`    ✓ ${GMAIL_MESSAGES.length} Gmail messages`);

  // ── Drive ─────────────────────────────────────────────────────────────────
  console.log("  → Drive documents…");
  for (const doc of DRIVE_DOCS) {
    const driveUser = sumit; // Sumit owns all drive docs
    await prisma.driveExtraction.create({
      data: {
        userId: driveUser.id,
        displayName: doc.displayName,
        sourceFileIds: doc.fileIds,
        sourcesJson: doc.fileIds.map((fid) => ({ id: fid, name: doc.displayName, mimeType: "application/vnd.google-apps.document" })),
        extractedText: doc.text,
      },
    });

    const isoTs = isoDate(doc.m, doc.d).toISOString();
    await prisma.ingestedDocument.create({
      data: {
        sourceId: doc.id, sourceType: "drive",
        rawText: doc.text, subject: doc.displayName, timestamp: isoTs,
        author: "Farship",
        isRelevant: doc.entities.is_relevant,
        decisions: doc.entities.decisions,
        people: doc.entities.people,
        topics: doc.entities.topics,
      },
    });

    const seedPayload: SeedPayload = {
      source_id: doc.id, source_type: "drive",
      raw_text: doc.text,
      metadata: { timestamp: isoTs, subject: doc.displayName, author: "Farship" },
    };
    chromaPayloads.push(seedPayload);
    if (doc.entities.is_relevant) neo4jPayloads.push({ payload: seedPayload, entities: doc.entities });
  }
  console.log(`    ✓ ${DRIVE_DOCS.length} Drive documents`);

  // ── Meetings ──────────────────────────────────────────────────────────────
  console.log("  → Meetings…");
  for (const mtg of MEETINGS) {
    const startTime = isoDate(mtg.m, mtg.d, mtg.startHour);
    const endTime = new Date(startTime.getTime() + mtg.durationMins * 60_000);

    const meeting = await prisma.meeting.create({
      data: {
        eventId: `gcal_${mtg.id}`,
        calendarId: calendarConnections[sumit.id],
        userId: sumit.id,
        title: mtg.title,
        platform: "google_meet",
        meetingUrl: `https://meet.google.com/${mtg.id.replace("_", "-")}`,
        startTimeUtc: startTime,
        endTimeUtc: endTime,
        botStatus: "done",
      },
    });

    // All three members attend every meeting
    for (const u of createdUsers) {
      await prisma.meetingAttendee.create({
        data: {
          meetingId: meeting.id,
          attendeeEmail: u.email!,
          isOrganizer: u.id === sumit.id,
          responseStatus: "accepted",
        },
      });
    }

    // Transcript segments
    for (const seg of mtg.segments) {
      const segStart = new Date(startTime.getTime() + seg.offsetMins * 60_000);
      const segEnd = new Date(segStart.getTime() + seg.durationMins * 60_000);
      await prisma.transcript.create({
        data: {
          meetingId: meeting.id,
          botId: `bot_${mtg.id}`,
          speaker: seg.speaker,
          speakerId: seg.speakerId,
          transcriptText: seg.text,
          startTranscriptTime: segStart,
          endTranscriptTime: segEnd,
        },
      });
    }

    // IngestedDocument: full concatenated transcript
    const fullTranscript = mtg.segments
      .map((s) => `[${s.speaker}]: ${s.text}`)
      .join("\n\n");
    const isoTs = startTime.toISOString();
    await prisma.ingestedDocument.create({
      data: {
        sourceId: mtg.id, sourceType: "meeting",
        rawText: fullTranscript, subject: mtg.title, timestamp: isoTs,
        author: "Farship",
        isRelevant: mtg.entities.is_relevant,
        decisions: mtg.entities.decisions,
        people: mtg.entities.people,
        topics: mtg.entities.topics,
      },
    });

    const seedPayload: SeedPayload = {
      source_id: mtg.id, source_type: "meeting",
      raw_text: fullTranscript,
      metadata: { timestamp: isoTs, subject: mtg.title, author: "Farship" },
    };
    chromaPayloads.push(seedPayload);
    if (mtg.entities.is_relevant) neo4jPayloads.push({ payload: seedPayload, entities: mtg.entities });
  }
  console.log(`    ✓ ${MEETINGS.length} meetings`);

  // ── ChromaDB upsert ───────────────────────────────────────────────────────
  console.log("\n  → Embedding and upserting to ChromaDB…");
  await batchUpsertChroma(collection, chromaPayloads, "all");
  console.log(`  ✓ ${chromaPayloads.length} documents embedded in ChromaDB`);

  // ── Neo4j write ───────────────────────────────────────────────────────────
  console.log("\n  → Writing knowledge graph to Neo4j…");
  let neo4jCount = 0;
  for (const { payload, entities } of neo4jPayloads) {
    await writeNeo4j(neo4jSession, payload, entities);
    neo4jCount++;
  }
  await neo4jSession.close();
  await neo4jDriver.close();
  console.log(`  ✓ ${neo4jCount} relevant documents written to Neo4j`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n✅  Seed complete!");
  console.log(`   Users:          ${createdUsers.length}`);
  console.log(`   Slack messages: ${SLACK_MESSAGES.length}`);
  console.log(`   Gmail messages: ${GMAIL_MESSAGES.length}`);
  console.log(`   Drive docs:     ${DRIVE_DOCS.length}`);
  console.log(`   Meetings:       ${MEETINGS.length}`);
  console.log(`   ChromaDB docs:  ${chromaPayloads.length}`);
  console.log(`   Neo4j entities: ${neo4jCount} source nodes (with decisions, topics, people)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

// ── Neo4j ──────────────────────────────────────────────────────────────────────
function dKey(text: string): string {
  return text.toLowerCase()
    .replace(/^(we\s+|team\s+|i\s+)?(decided|agreed|concluded|chose|selected|will|going)\s+(to\s+)?/, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function writeNeo4j(
  session: ReturnType<ReturnType<typeof neo4j.driver>["session"]>,
  payload: SeedPayload,
  entities: SeedEntities,
): Promise<void> {
  if (!entities.is_relevant) return;
  const labelMap: Record<string, string> = { slack: "SlackMessage", gmail: "Email", drive: "Document", meeting: "Meeting" };
  const label = labelMap[payload.source_type] ?? "SlackMessage";

  await session.run(
    `MERGE (s:${label} {source_id: $sid})
     SET s.timestamp=$ts, s.raw_preview=$preview, s.channel=$ch, s.subject=$sub, s.author=$author`,
    { sid: payload.source_id, ts: payload.metadata.timestamp, preview: payload.raw_text.slice(0, 200),
      ch: payload.metadata.channel ?? null, sub: payload.metadata.subject ?? null, author: payload.metadata.author ?? null },
  );
  for (const t of entities.topics) await session.run("MERGE (t:Topic {name:$n})", { n: t.toLowerCase() });

  for (const dec of entities.decisions) {
    const key = dKey(dec);
    const topic = entities.topics[0]?.toLowerCase() ?? "general";
    await session.run(
      `MERGE (d:Decision {key:$key})
       ON CREATE SET d.text=$text, d.topic=$topic, d.first_seen=$ts
       ON MATCH  SET d.last_seen=$ts
       WITH d MATCH (s:${label} {source_id:$sid}) MERGE (s)-[:SUPPORTS]->(d)`,
      { key, text: dec, topic, sid: payload.source_id, ts: payload.metadata.timestamp },
    );
    for (const t of entities.topics)
      await session.run("MATCH (d:Decision {key:$key}) MERGE (t:Topic {name:$t}) MERGE (d)-[:ABOUT]->(t)", { key, t: t.toLowerCase() });
    for (const p of entities.people)
      await session.run("MERGE (p:Person {name:$n}) WITH p MATCH (d:Decision {key:$key}) MERGE (p)-[:MADE]->(d)", { n: p, key });
    for (const r of entities.reasons) {
      const rk = r.toLowerCase().trim().slice(0, 120);
      await session.run(
        "MERGE (r:Reason {key:$rk}) ON CREATE SET r.text=$r WITH r MATCH (d:Decision {key:$key}) MERGE (d)-[:HAS_REASON]->(r)",
        { rk, r, key },
      );
    }
  }
}
