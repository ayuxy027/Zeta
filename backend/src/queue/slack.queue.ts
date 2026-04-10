import { Queue } from 'bullmq';
import { config } from '../config.js';

let slackQueue: Queue | null = null;

try {
  slackQueue = new Queue('slack-events', {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  });
  console.log('Redis queue initialized successfully');
} catch (error) {
  console.warn('Redis not available, queue operations will be skipped:', error);
}

export { slackQueue };

export interface SlackJobData {
  event_id: string;
  event: any;
  timestamp: number;
}
