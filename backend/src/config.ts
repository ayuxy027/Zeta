import dotenv from 'dotenv';

dotenv.config();

export const config = {
  /** Slack webhook signing (see routers/slack.router.ts) */
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET ?? '',

  /** BullMQ / Redis for async Slack event handling (see queue/slack.queue.ts) */
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
