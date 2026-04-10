import { Worker, type Job } from 'bullmq';
import { config } from '../config.js';
import type { SlackJobData } from '../queue/slack.queue.js';

function redisConnectionFromUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: u.port ? Number(u.port) : 6379,
      ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
      ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

export function startSlackWorker() {
  const conn = redisConnectionFromUrl(config.redisUrl);

  const worker = new Worker<SlackJobData>(
    'slack-events',
    async (job: Job<SlackJobData>) => {
      const { event_id, event } = job.data;
      const e = event as Record<string, unknown>;

      console.log(`\n[Worker] Processing job: ${job.id}`);
      console.log(`  event_id : ${event_id}`);
      console.log(`  channel  : ${e['channel']}`);
      console.log(`  user     : ${e['user']}`);
      console.log(`  text     : ${e['text']}`);
      console.log(`  ts       : ${e['ts']}`);

      // TODO: Step 2 — fetch full thread via Slack API
      // TODO: Step 3 — LLM entity extraction
      // TODO: Step 4 — write to Neo4j
      // TODO: Step 5 — write to ChromaDB

      console.log(`[Worker] Done processing ${event_id}\n`);
    },
    { connection: conn },
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Worker] Slack worker started, waiting for jobs...');
  return worker;
}
