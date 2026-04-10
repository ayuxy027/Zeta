import { Queue } from 'bullmq';
import { config } from '../config.js';

function redisConnectionFromUrl(url: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
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

let slackQueue: Queue | null = null;

try {
  const conn = redisConnectionFromUrl(config.redisUrl);
  slackQueue = new Queue('slack-events', { connection: conn });
  console.log('[slack] BullMQ queue connected to Redis at', `${conn.host}:${conn.port}`);
} catch (error) {
  console.warn('[slack] Redis not available, Slack queue disabled:', error);
}

export { slackQueue };

export interface SlackJobData {
  event_id: string;
  event: unknown;
  timestamp: number;
}
