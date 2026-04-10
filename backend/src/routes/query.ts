import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import neo4j from "neo4j-driver";
import { answerQuestion, buildInputFallback } from "../services/query.service.js";
import { runPipeline } from "../pipeline/pipeline.js";
import type { PipelinePayload } from "../pipeline/types.js";
import { prisma } from "../lib/prisma.js";
import { extractTextFromBuffer } from "../lib/extractText.js";

const WINDOW_MS = 60_000;
const RATE_LIMIT_PER_WINDOW = 120;
const ingestRouteHits = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const current = ingestRouteHits.get(key);
  if (!current || now - current.windowStart > WINDOW_MS) {
    ingestRouteHits.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (current.count >= RATE_LIMIT_PER_WINDOW) {
    return false;
  }
  current.count += 1;
  ingestRouteHits.set(key, current);
  return true;
}

export function createQueryRouter() {
  const router = express.Router();

  router.post("/query", async (req: Request, res: Response) => {
    const { question } = req.body as { question?: string };
    const normalizedQuestion = question?.trim() ?? "";

    if (!normalizedQuestion) {
      res.json(buildInputFallback(normalizedQuestion));
      return;
    }

    try {
      const result = await answerQuestion(normalizedQuestion);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      console.error("[query] Error:", message);
      res.json({
        ...buildInputFallback(normalizedQuestion),
        fallback: {
          scenario: "route_failure",
          isMock: true,
          note: "Route-level safeguard returned a stable continuity response.",
        },
      });
    }
  });

  // Direct ingest endpoint — feed any source into the pipeline
  router.post("/ingest", async (req: Request, res: Response) => {
    const body = req.body as Partial<PipelinePayload>;

    if (!checkRateLimit(`ingest:${req.ip}`)) {
      res.status(429).json({ error: "Too many ingest requests. Please retry in a minute." });
      return;
    }

    if (!body.source_id || !body.source_type || !body.raw_text || !body.metadata?.timestamp) {
      res.status(400).json({ error: "Required: source_id, source_type, raw_text, metadata.timestamp" });
      return;
    }

    const payload: PipelinePayload = {
      source_id: body.source_id,
      source_type: body.source_type,
      raw_text: body.raw_text,
      metadata: {
        author: body.metadata.author,
        timestamp: body.metadata.timestamp,
        subject: body.metadata.subject,
        channel: body.metadata.channel,
        url: body.metadata.url,
      },
    };

    try {
      const result = await runPipeline(payload);

      // Persist raw data + extraction results to PostgreSQL
      try {
        await prisma.ingestedDocument.upsert({
          where: { sourceId: payload.source_id },
          update: {
            rawText: payload.raw_text,
            isRelevant: result.entities?.is_relevant ?? false,
            decisions: result.entities?.decisions ?? [],
            people: result.entities?.people ?? [],
            topics: result.entities?.topics ?? [],
          },
          create: {
            sourceId: payload.source_id,
            sourceType: payload.source_type,
            rawText: payload.raw_text,
            author: payload.metadata.author ?? null,
            subject: payload.metadata.subject ?? null,
            channel: payload.metadata.channel ?? null,
            timestamp: payload.metadata.timestamp,
            isRelevant: result.entities?.is_relevant ?? false,
            decisions: result.entities?.decisions ?? [],
            people: result.entities?.people ?? [],
            topics: result.entities?.topics ?? [],
          },
        });
      } catch (dbErr) {
        console.warn("[ingest] Postgres persist failed:", (dbErr as Error).message);
      }

      res.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ingest failed";
      console.error("[ingest] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  // Chat upload endpoint: PDF only, parse + pipeline ingest
  router.post("/upload/pdf", async (req: Request, res: Response) => {
    if (!checkRateLimit(`upload:${req.ip}`)) {
      res.status(429).json({ error: "Too many upload requests. Please retry in a minute." });
      return;
    }

    const body = req.body as {
      fileName?: string;
      mimeType?: string;
      dataBase64?: string;
    };

    const fileName = (body.fileName ?? "uploaded.pdf").trim();
    const mimeType = (body.mimeType ?? "application/pdf").trim();
    const base64 = (body.dataBase64 ?? "").trim();

    if (!base64) {
      res.status(400).json({ error: "Missing PDF payload." });
      return;
    }

    if (mimeType !== "application/pdf") {
      res.status(400).json({ error: "Only PDF uploads are supported." });
      return;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      res.status(400).json({ error: "Invalid base64 payload." });
      return;
    }

    if (buffer.length === 0) {
      res.status(400).json({ error: "Uploaded PDF is empty." });
      return;
    }

    if (buffer.length > 250 * 1024 * 1024) {
      res.status(413).json({ error: "PDF too large for this demo endpoint (max 250 MB)." });
      return;
    }

    try {
      const extracted = await extractTextFromBuffer(buffer, "application/pdf", fileName);
      const text = extracted.text.trim();

      if (!text) {
        res.status(400).json({ error: "No extractable text found in PDF." });
        return;
      }

      const sourceId = `upload_${randomUUID()}`;
      const userSub = req.oidc.user?.sub ?? "demo-upload-user";
      const timestamp = new Date().toISOString();

      const payload: PipelinePayload = {
        source_id: sourceId,
        source_type: "drive",
        raw_text: text,
        metadata: {
          author: userSub,
          timestamp,
          subject: fileName,
          channel: "chat-upload",
        },
      };

      const result = await runPipeline(payload);

      try {
        await prisma.ingestedDocument.upsert({
          where: { sourceId },
          update: {
            rawText: text,
            isRelevant: result.entities?.is_relevant ?? false,
            decisions: result.entities?.decisions ?? [],
            people: result.entities?.people ?? [],
            topics: result.entities?.topics ?? [],
          },
          create: {
            sourceId,
            sourceType: "drive",
            rawText: text,
            author: userSub,
            subject: fileName,
            channel: "chat-upload",
            timestamp,
            isRelevant: result.entities?.is_relevant ?? false,
            decisions: result.entities?.decisions ?? [],
            people: result.entities?.people ?? [],
            topics: result.entities?.topics ?? [],
          },
        });
      } catch (dbErr) {
        console.warn("[upload/pdf] Postgres persist failed:", (dbErr as Error).message);
      }

      res.json({
        ok: true,
        sourceId,
        fileName,
        charCount: text.length,
        warnings: extracted.warnings,
        entities: result.entities,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF upload failed";
      console.error("[upload/pdf] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  // Live stats from Neo4j for the Visualise dashboard
  router.get("/stats", async (_req: Request, res: Response) => {
    const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD ?? "password";
    const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();

    try {
      // 1. Counts
      const countsResult = await session.run(
        `MATCH (d:Decision) WITH count(d) AS decisions
         MATCH (p:Person)   WITH decisions, count(p) AS people
         MATCH (t:Topic)    WITH decisions, people, count(t) AS topics
         MATCH (s) WHERE s:SlackMessage OR s:Email OR s:Document OR s:Meeting
         RETURN decisions, people, topics, count(s) AS sources`,
      );
      const row = countsResult.records[0];
      const toNum = (v: unknown) => typeof v === 'object' && v !== null && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v);
      const counts = {
        decisions: row ? toNum(row.get("decisions")) : 0,
        people: row ? toNum(row.get("people")) : 0,
        topics: row ? toNum(row.get("topics")) : 0,
        sources: row ? toNum(row.get("sources")) : 0,
      };

      // 2. Recent decisions with who + source type
      const decisionsResult = await session.run(
        `MATCH (p:Person)-[:MADE]->(d:Decision)
         OPTIONAL MATCH (d)-[:ABOUT]->(t:Topic)
         OPTIONAL MATCH (s)-[:SUPPORTS]->(d)
         WITH d, p, collect(DISTINCT t.name) AS topics, collect(DISTINCT labels(s)[0]) AS sourceLabels
         RETURN d.text AS decision, d.key AS key, p.name AS person,
                topics, sourceLabels, d.first_seen AS when
         ORDER BY d.first_seen DESC`,
      );

      const labelToType: Record<string, string> = {
        SlackMessage: "slack", Email: "gmail", Document: "drive", Meeting: "meeting",
      };

      // Deduplicate by decision key (multiple people may have MADE the same decision)
      const decisionMap = new Map<string, {
        decision: string; people: string[]; topics: string[]; source: string; when: string;
      }>();

      for (const rec of decisionsResult.records) {
        const key = (rec.get("key") as string) ?? "";
        const existing = decisionMap.get(key);
        const person = (rec.get("person") as string) ?? "";
        const sourceLabels = (rec.get("sourceLabels") as string[]) ?? [];
        const source = labelToType[sourceLabels[0] ?? ""] ?? "unknown";
        const topics = ((rec.get("topics") as string[]) ?? []).filter(Boolean);

        if (existing) {
          if (!existing.people.includes(person)) existing.people.push(person);
        } else {
          decisionMap.set(key, {
            decision: (rec.get("decision") as string) ?? "",
            people: [person],
            topics,
            source,
            when: (rec.get("when") as string) ?? "",
          });
        }
      }

      const decisions = [...decisionMap.values()];

      // 3. Source distribution
      const distResult = await session.run(
        `MATCH (s)-[:SUPPORTS]->(d:Decision)
         RETURN labels(s)[0] AS label, count(DISTINCT d) AS cnt`,
      );
      const distribution: Record<string, number> = {};
      for (const rec of distResult.records) {
        const label = labelToType[(rec.get("label") as string) ?? ""] ?? "unknown";
        distribution[label] = toNum(rec.get("cnt"));
      }

      res.json({ counts, decisions, distribution });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stats failed";
      console.error("[stats] Error:", message);
      res.status(500).json({ error: message });
    } finally {
      await session.close();
      await driver.close();
    }
  });

  return router;
}
