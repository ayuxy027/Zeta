-- CreateTable
CREATE TABLE "public"."integration_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "providerEmail" TEXT,
    "providerTeamId" TEXT,
    "providerTeamName" TEXT,
    "providerScopes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."slack_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT,
    "channelId" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ts" TEXT NOT NULL,
    "threadTs" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slack_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gmail_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "threadId" TEXT,
    "subject" TEXT,
    "from" TEXT,
    "to" TEXT,
    "date" TEXT,
    "snippet" TEXT,
    "bodyText" TEXT,
    "labelIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gmail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."drive_extractions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sourceFileIds" JSONB NOT NULL,
    "sourcesJson" JSONB NOT NULL,
    "extractedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ingested_documents" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "author" TEXT,
    "subject" TEXT,
    "channel" TEXT,
    "timestamp" TEXT,
    "isRelevant" BOOLEAN NOT NULL DEFAULT false,
    "decisions" JSONB NOT NULL DEFAULT '[]',
    "people" JSONB NOT NULL DEFAULT '[]',
    "topics" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingested_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recall_bot_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recall_bot_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarEmail" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'google',
    "recallCalendarId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meetings" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "meetingUrl" TEXT,
    "platform" TEXT,
    "startTimeUtc" TIMESTAMP(3) NOT NULL,
    "endTimeUtc" TIMESTAMP(3) NOT NULL,
    "botId" TEXT,
    "botStatus" TEXT,
    "botStatusSubCode" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."meeting_attendees" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "attendeeEmail" TEXT NOT NULL,
    "isOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "responseStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transcripts" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "speaker" TEXT,
    "speakerId" TEXT,
    "transcriptText" TEXT NOT NULL,
    "startTranscriptTime" TIMESTAMP(3) NOT NULL,
    "endTranscriptTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_credentials_userId_idx" ON "public"."integration_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_credentials_userId_provider_key" ON "public"."integration_credentials"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "slack_messages_eventId_key" ON "public"."slack_messages"("eventId");

-- CreateIndex
CREATE INDEX "slack_messages_userId_idx" ON "public"."slack_messages"("userId");

-- CreateIndex
CREATE INDEX "slack_messages_channelId_idx" ON "public"."slack_messages"("channelId");

-- CreateIndex
CREATE INDEX "slack_messages_teamId_idx" ON "public"."slack_messages"("teamId");

-- CreateIndex
CREATE INDEX "gmail_messages_userId_idx" ON "public"."gmail_messages"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gmail_messages_userId_gmailMessageId_key" ON "public"."gmail_messages"("userId", "gmailMessageId");

-- CreateIndex
CREATE INDEX "drive_extractions_userId_idx" ON "public"."drive_extractions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ingested_documents_sourceId_key" ON "public"."ingested_documents"("sourceId");

-- CreateIndex
CREATE INDEX "ingested_documents_sourceType_idx" ON "public"."ingested_documents"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "recall_bot_settings_userId_key" ON "public"."recall_bot_settings"("userId");

-- CreateIndex
CREATE INDEX "recall_bot_settings_userId_idx" ON "public"."recall_bot_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_calendarId_key" ON "public"."calendar_connections"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_connections_userId_idx" ON "public"."calendar_connections"("userId");

-- CreateIndex
CREATE INDEX "meetings_userId_idx" ON "public"."meetings"("userId");

-- CreateIndex
CREATE INDEX "meetings_startTimeUtc_idx" ON "public"."meetings"("startTimeUtc");

-- CreateIndex
CREATE INDEX "meetings_botId_idx" ON "public"."meetings"("botId");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_eventId_calendarId_key" ON "public"."meetings"("eventId", "calendarId");

-- CreateIndex
CREATE INDEX "meeting_attendees_meetingId_idx" ON "public"."meeting_attendees"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendees_meetingId_attendeeEmail_key" ON "public"."meeting_attendees"("meetingId", "attendeeEmail");

-- CreateIndex
CREATE INDEX "transcripts_meetingId_idx" ON "public"."transcripts"("meetingId");

-- CreateIndex
CREATE INDEX "transcripts_botId_idx" ON "public"."transcripts"("botId");

-- CreateIndex
CREATE INDEX "transcripts_createdAt_idx" ON "public"."transcripts"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."integration_credentials" ADD CONSTRAINT "integration_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slack_messages" ADD CONSTRAINT "slack_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gmail_messages" ADD CONSTRAINT "gmail_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drive_extractions" ADD CONSTRAINT "drive_extractions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recall_bot_settings" ADD CONSTRAINT "recall_bot_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_connections" ADD CONSTRAINT "calendar_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."calendar_connections"("calendarId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."meeting_attendees" ADD CONSTRAINT "meeting_attendees_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transcripts" ADD CONSTRAINT "transcripts_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
