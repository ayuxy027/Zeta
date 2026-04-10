import { Router, type Request, type Response } from 'express';
import { createHmac } from 'crypto';
import { config } from '../config.js';
import { slackQueue, type SlackJobData } from '../queue/slack.queue.js';
import type { SlackEvent } from '../types/slack.types.js';

const router = Router();

// Verify Slack signature against the raw request body (not re-serialized JSON)
function verifySlackSignature(timestamp: string, signature: string, rawBody: string): boolean {
  if (config.nodeEnv === 'development') {
    return true;
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp, 10) < fiveMinutesAgo) {
    return false;
  }

  const hmac = createHmac('sha256', config.slackSigningSecret);
  hmac.update(`v0:${timestamp}:${rawBody}`);
  const computed = `v0=${hmac.digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  if (computed.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// POST /slack/events - Main webhook endpoint
router.post('/events', async (req: Request, res: Response) => {
  const body = req.body as SlackEvent;
  
  // Handle URL verification challenge (one-time setup)
  if (body.type === 'url_verification') {
    console.log('Slack URL verification received');
    return res.json({ challenge: body.challenge });
  }
  
  // Handle event callback
  if (body.type === 'event_callback' && body.event_id && body.event) {
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const signature = req.headers['x-slack-signature'] as string;
    const rawBody = (req as unknown as Record<string, unknown>).rawBody as string ?? '';

    // Verify signature against original raw body bytes
    if (!verifySlackSignature(timestamp, signature, rawBody)) {
      console.error('Invalid Slack signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Drop to queue for async processing (3-second rule)
    if (slackQueue) {
      const jobData: SlackJobData = {
        event_id: body.event_id,
        team_id: body.team_id,
        event: body.event,
        timestamp: Date.now(),
      };
      
      await slackQueue.add('slack-event', jobData);
      console.log(`Slack event ${body.event_id} queued for processing`);
    } else {
      console.warn(`Slack event ${body.event_id} received but queue not available - skipping`);
    }
    
    // Return immediately (must be < 3 seconds)
    return res.status(200).json({ ok: true });
  }
  
  return res.status(400).json({ error: 'Unknown event type' });
});

export default router;
