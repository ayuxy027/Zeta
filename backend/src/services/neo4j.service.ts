import neo4j, { type Driver, type Session } from "neo4j-driver";
import type { PipelinePayload, ExtractedEntities } from "../pipeline/types.js";

let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
    const user = process.env.NEO4J_USER ?? "neo4j";
    const password = process.env.NEO4J_PASSWORD ?? "password";
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

const SOURCE_LABELS: Record<PipelinePayload["source_type"], string> = {
  slack: "SlackMessage",
  gmail: "Email",
  drive: "Document",
  meeting: "Meeting",
};

// Normalize decision text into a stable dedup key
// Strips filler phrases so "we decided to use AWS" and "decided to use AWS" hash the same
function decisionKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/^(we\s+|team\s+|i\s+)?(decided|agreed|concluded|chose|selected|will|going)\s+(to\s+)?/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function initNeo4j(): Promise<void> {
  const session = getDriver().session();
  try {
    // Uniqueness constraints (also create backing indexes automatically)
    const constraints = [
      "CREATE CONSTRAINT source_id_slack IF NOT EXISTS FOR (n:SlackMessage) REQUIRE n.source_id IS UNIQUE",
      "CREATE CONSTRAINT source_id_email IF NOT EXISTS FOR (n:Email) REQUIRE n.source_id IS UNIQUE",
      "CREATE CONSTRAINT source_id_doc IF NOT EXISTS FOR (n:Document) REQUIRE n.source_id IS UNIQUE",
      "CREATE CONSTRAINT source_id_meeting IF NOT EXISTS FOR (n:Meeting) REQUIRE n.source_id IS UNIQUE",
      "CREATE CONSTRAINT decision_key IF NOT EXISTS FOR (n:Decision) REQUIRE n.key IS UNIQUE",
      "CREATE CONSTRAINT person_name IF NOT EXISTS FOR (n:Person) REQUIRE n.name IS UNIQUE",
      "CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (n:Topic) REQUIRE n.name IS UNIQUE",
      "CREATE CONSTRAINT reason_key IF NOT EXISTS FOR (n:Reason) REQUIRE n.key IS UNIQUE",
    ];

    for (const c of constraints) {
      await session.run(c);
    }

    console.log("[neo4j] Constraints and indexes initialized");
  } finally {
    await session.close();
  }
}

export async function writeToGraph(
  payload: PipelinePayload,
  entities: ExtractedEntities,
): Promise<void> {
  const session: Session = getDriver().session();

  try {
    const label = SOURCE_LABELS[payload.source_type];

    // 1. Upsert source node
    await session.run(
      `MERGE (s:${label} {source_id: $source_id})
       SET s.timestamp  = $timestamp,
           s.raw_preview = $preview,
           s.channel     = $channel,
           s.subject     = $subject,
           s.author      = $author`,
      {
        source_id: payload.source_id,
        timestamp: payload.metadata.timestamp,
        preview: payload.raw_text.slice(0, 200),
        channel: payload.metadata.channel ?? null,
        subject: payload.metadata.subject ?? null,
        author: payload.metadata.author ?? null,
      },
    );

    // 2. Upsert Topic nodes
    for (const topicName of entities.topics) {
      await session.run(
        `MERGE (t:Topic {name: $name})`,
        { name: topicName.toLowerCase() },
      );
    }

    // 3. Upsert Decision nodes (keyed by normalized text to prevent duplicates)
    for (const decisionText of entities.decisions) {
      const key = decisionKey(decisionText);
      const primaryTopic = entities.topics[0]?.toLowerCase() ?? "general";

      // Upsert decision by stable key; preserve original text on first write
      await session.run(
        `MERGE (d:Decision {key: $key})
         ON CREATE SET d.text = $text, d.topic = $topic, d.first_seen = $timestamp
         ON MATCH  SET d.last_seen = $timestamp
         WITH d
         MATCH (s:${label} {source_id: $source_id})
         MERGE (s)-[:SUPPORTS]->(d)`,
        {
          key,
          text: decisionText,
          topic: primaryTopic,
          source_id: payload.source_id,
          timestamp: payload.metadata.timestamp,
        },
      );

      // Link decision → topics
      for (const topicName of entities.topics) {
        await session.run(
          `MATCH (d:Decision {key: $key})
           MERGE (t:Topic {name: $topicName})
           MERGE (d)-[:ABOUT]->(t)`,
          { key, topicName: topicName.toLowerCase() },
        );
      }

      // 4. Upsert Person nodes + MADE relationship
      for (const person of entities.people) {
        await session.run(
          `MERGE (p:Person {name: $name})
           WITH p
           MATCH (d:Decision {key: $key})
           MERGE (p)-[:MADE]->(d)`,
          { name: person, key },
        );
      }

      // 5. Upsert Reason nodes + HAS_REASON relationship
      for (const reasonText of entities.reasons) {
        const reasonKey = reasonText.toLowerCase().trim().slice(0, 120);
        await session.run(
          `MERGE (r:Reason {key: $reasonKey})
           ON CREATE SET r.text = $reasonText
           WITH r
           MATCH (d:Decision {key: $key})
           MERGE (d)-[:HAS_REASON]->(r)`,
          { reasonKey, reasonText, key },
        );
      }
    }
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
