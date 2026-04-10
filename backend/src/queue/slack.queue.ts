import { Queue } from "bullmq";
import { config } from "../config.js";

function redisConnectionFromUrl(url: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
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

let slackQueue: Queue | null = null;
const isRedisEnabled =
  process.env.REDIS_ENABLED === "true" || config.nodeEnv === "production";

if (isRedisEnabled) {
  try {
    const conn = redisConnectionFromUrl(config.redisUrl);

    slackQueue = new Queue("slack-events", {
      connection: {
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      },
    });

    slackQueue.on("error", (error) => {
      console.warn(
        "Redis queue connection error; queue operations will be skipped until Redis is available:",
        error.message,
      );
    });

    console.log(
      "[slack] BullMQ queue connected to Redis at",
      `${conn.host}:${conn.port}`,
    );
  } catch (error) {
    console.warn("[slack] Redis not available, Slack queue disabled:", error);
  }
} else {
  console.log(
    "[slack] Redis queue disabled (set REDIS_ENABLED=true to enable BullMQ)",
  );
}

export { slackQueue };

export interface SlackJobData {
  event_id: string;
  team_id: string | undefined;
  event: unknown;
  timestamp: number;
}
