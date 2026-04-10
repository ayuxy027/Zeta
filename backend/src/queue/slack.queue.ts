import { Queue } from 'bullmq';
import { config } from '../config.js';

export const slackQueue = new Queue('slack-events', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

export interface SlackJobData {
  event_id: string;
  event: any;
  timestamp: number;
}
