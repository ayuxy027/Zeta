import { Worker, type Job } from "bullmq";
import { config } from "../config.js";
import type { SlackJobData } from "../queue/slack.queue.js";
import { prisma } from "../lib/prisma.js";
import { runPipeline } from "../pipeline/pipeline.js";
import type { PipelinePayload } from "../pipeline/types.js";

function redisConnectionFromUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || "localhost",
      port: u.port ? Number(u.port) : 6379,
      ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
      ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    };
  } catch {
    return { host: "localhost", port: 6379 };
  }
}

export function startSlackWorker() {
  const isRedisEnabled =
    process.env.REDIS_ENABLED === "true" || config.nodeEnv === "production";

  if (!isRedisEnabled) {
    console.log(
      "[Worker] Slack worker disabled (set REDIS_ENABLED=true to enable)",
    );
    return null;
  }

  const conn = redisConnectionFromUrl(config.redisUrl);

  const worker = new Worker<SlackJobData>(
    "slack-events",
    async (job: Job<SlackJobData>) => {
      const { event_id, team_id, event } = job.data;
      const e = event as Record<string, unknown>;

      const text = (e["text"] as string) ?? "";
      const channel = (e["channel"] as string) ?? "";
      const user = (e["user"] as string) ?? "";
      const ts = (e["ts"] as string) ?? "";
      const threadTs = (e["thread_ts"] as string | undefined) ?? undefined;

      console.log(`\n[Worker] Processing job: ${job.id}`);
      console.log(`  event_id : ${event_id}`);
      console.log(`  channel  : ${channel}`);
      console.log(`  user     : ${user}`);
      console.log(`  text     : ${text}`);

      if (!text.trim()) {
        console.log(`[Worker] Skipping empty message ${event_id}`);
        return;
      }

      const payload: PipelinePayload = {
        source_id: `slack_${channel}_${ts}`,
        source_type: "slack",
        raw_text: text,
        metadata: {
          author: user,
          timestamp: new Date(parseFloat(ts) * 1000).toISOString(),
          channel,
        },
      };

      // Persist raw message to PostgreSQL (fire-and-forget, non-blocking)
      if (team_id) {
        try {
          const cred = await prisma.integrationCredential.findFirst({
            where: { provider: "slack", providerTeamId: team_id, isActive: true },
            select: { userId: true },
          });
          if (cred?.userId) {
            await prisma.slackMessage.upsert({
              where: { eventId: event_id },
              update: {},
              create: {
                userId: cred.userId,
                eventId: event_id,
                teamId: team_id,
                channelId: channel,
                slackUserId: user,
                text,
                ts,
                threadTs,
                rawPayload: e as object,
              },
            });
            console.log(`[Worker] Persisted SlackMessage ${event_id}`);
          }
        } catch (dbErr) {
          console.warn(`[Worker] DB persist failed for ${event_id}:`, (dbErr as Error).message);
        }
      }

      const result = await runPipeline(payload);

      if (result.skipped) {
        console.log(`[Worker] Skipped ${event_id} — not relevant`);
      } else {
        console.log(
          `[Worker] Processed ${event_id}: ${result.entities?.decisions.length ?? 0} decisions extracted`,
        );
      }
      if (result.error) {
        console.warn(`[Worker] Partial error: ${result.error}`);
      }
    },
    {
      connection: {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err.message);
  });

  console.log("[Worker] Slack worker started, waiting for jobs...");
  return worker;
}
