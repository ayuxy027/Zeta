# Prerequisites for Simple Recall Bot Architecture

This document lists everything required before integrating the flow into another project:

1. User schedules a calendar meeting
2. Meeting details are stored in database tables
3. Recall bot is sent to the meeting
4. Transcript chunks are stored in transcript tables

## 1. Product and API Accounts

You need active accounts and API access for:

- Recall.ai (API key, calendar integration, webhooks)
- Google Cloud Console (OAuth client for Google Calendar)
- PostgreSQL database (Supabase or any managed Postgres)
- Backend hosting platform with public HTTPS URL

Optional but recommended:

- Domain name for webhook endpoints
- Error monitoring (Sentry, Datadog, or similar)

## 2. Backend Tech Stack

Minimum suggested stack:

- Node.js 20+
- TypeScript 5+
- Express.js
- Prisma ORM
- PostgreSQL

Required npm packages:

- express
- cors
- dotenv
- axios
- @prisma/client
- prisma (dev dependency)
- typescript
- ts-node or tsx

## 3. Environment Variables

Create a .env file in your backend project with:

PORT=8080
DATABASE_URL=postgresql://username:password@host:5432/database

RECALL_API_KEY=your_recall_api_key
RECALL_BASE_URL=https://us-west-2.recall.ai

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-app.com/oauth/google/callback

APP_WEBHOOK_SECRET=use_a_long_random_secret

Notes:

- Use the Recall base URL for your region.
- APP_WEBHOOK_SECRET must be the same value used in incoming webhook headers.

## 4. Google OAuth Prerequisites

In Google Cloud Console:

- Enable Google Calendar API
- Configure OAuth consent screen
- Create OAuth 2.0 client credentials (Web application)
- Add authorized redirect URI used by your backend
- Request scopes needed for calendar read access

The integration flow expects you can exchange auth code to obtain:

- access_token (short-lived)
- refresh_token (long-lived)
- user email

## 5. Database Prerequisites

Create these core tables (or Prisma models):

- users
- calendar_connections
- meetings
- meeting_attendees
- transcript

Required data shape:

- calendar_connections:
  - user_id
  - calendar_id (unique)
  - calendar_email
  - refresh_token
  - platform

- meetings:
  - event_id (unique)
  - calendar_id
  - user_id
  - meeting_url
  - start_time_utc
  - end_time_utc
  - is_deleted
  - bot_id
  - bot_status
  - bot_status_sub_code

- meeting_attendees:
  - meeting_id
  - attendee_email
  - is_organizer
  - response_status

- transcript:
  - meeting_id
  - bot_id
  - speaker
  - speaker_id
  - transcript_text
  - start_transcript_time
  - end_transcript_time
  - created_at

Important compatibility note from working implementation:

- If your transcript table has created_at as VARCHAR and NOT NULL, always write created_at explicitly from webhook handlers.

## 6. Recall.ai Configuration Prerequisites

You must configure these in Recall.ai:

1. Calendar integration creation using Google OAuth refresh token
2. Calendar sync webhook endpoint
3. Bot status webhook endpoint
4. Real-time transcription callback endpoint

Expected webhook routes in your backend:

- POST /webhooks/recall/calendar-sync
- POST /webhooks/recall/bot-status
- POST /webhooks/recall/transcription

Each route should validate the secret header and return quickly.

## 7. Security Prerequisites

Before production:

- Validate webhook signatures or secret headers
- Never hardcode API keys in source code
- Store all credentials in environment variables
- Restrict CORS to known origins
- Add basic request rate limiting
- Add idempotent upsert logic for all webhook writes

## 8. Runtime and Infra Prerequisites

Your backend must be:

- Publicly reachable over HTTPS
- Always on (webhooks must not miss events)
- Able to process retries from Recall webhooks
- Connected to a reliable Postgres instance

Recommended:

- Queue or background job support for heavier post-processing
- Dead-letter handling for failed webhook payloads
- Structured logs with request IDs

## 9. Functional Flow Prerequisites Checklist

Mark each item before integration:

- Google OAuth flow returns refresh token and user email
- Calendar connection is stored in calendar_connections
- Recall calendar is created and calendar_id saved
- calendar.sync_events webhook receives payloads
- Meetings are upserted into meetings table
- Attendees are upserted into meeting_attendees table
- Bot scheduling call succeeds for meetings with valid meeting_url
- bot.status_change webhook updates bot status fields
- bot.transcription webhook stores transcript rows
- Transcript rows are linked by bot_id and meeting_id

## 10. Local Development Prerequisites

- ngrok or Cloudflare Tunnel for testing webhooks locally
- Seed user record in users table
- Valid test Google account with calendar events
- At least one meeting containing a supported meeting URL

Suggested local test order:

1. Connect Google Calendar
2. Verify calendar connection row saved
3. Trigger calendar sync event
4. Confirm meeting and attendees saved
5. Confirm bot gets scheduled
6. Join meeting and verify transcript rows are inserted

## 11. Production Readiness Checklist

- Retry-safe webhook handlers
- Duplicate event protection (upsert + unique keys)
- Alerting for webhook failures
- Audit logs for bot scheduling and transcript inserts
- Backfill process for missed calendar events
- Migration strategy for schema changes

## 12. Known Constraints

- Some platforms may provide meeting URL with delay or updates.
- If no meeting_url exists, bot scheduling should be skipped safely.
- Meeting platform restrictions can affect bot join success.
- Transcript chunks may come with missing speaker name; speaker_id fallback handling is recommended.

---

If all prerequisites above are complete, you can integrate the simple architecture directly into any Node + Postgres project with minimal changes.
