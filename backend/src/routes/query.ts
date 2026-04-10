import express, { type Request, type Response } from "express";
import neo4j from "neo4j-driver";
import { answerQuestion } from "../services/query.service.js";
import { runPipeline } from "../pipeline/pipeline.js";
import type { PipelinePayload } from "../pipeline/types.js";

export function createQueryRouter() {
  const router = express.Router();

  router.post("/query", async (req: Request, res: Response) => {
    const { question } = req.body as { question?: string };

    if (!question?.trim()) {
      res.status(400).json({ error: "Missing 'question' in request body" });
      return;
    }

    try {
      const result = await answerQuestion(question);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Query failed";
      console.error("[query] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  // Direct ingest endpoint — feed any source into the pipeline
  router.post("/ingest", async (req: Request, res: Response) => {
    const body = req.body as Partial<PipelinePayload>;

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
      res.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ingest failed";
      console.error("[ingest] Error:", message);
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
