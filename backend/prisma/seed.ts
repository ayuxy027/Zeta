import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ─────────────────────────────────────────────────────────────────

  const sumeet = await prisma.user.upsert({
    where: { auth0Sub: "auth0|seed_user_sumeet" },
    update: { email: "arigatoforest@gmail.com" },
    create: {
      auth0Sub: "auth0|seed_user_sumeet",
      email: "arigatoforest@gmail.com",
      name: "Sumeet",
      picture: "https://api.dicebear.com/7.x/initials/svg?seed=Sumeet",
    },
  });

  const priya = await prisma.user.upsert({
    where: { auth0Sub: "auth0|seed_user_priya" },
    update: {},
    create: {
      auth0Sub: "auth0|seed_user_priya",
      email: "priya.sharma@zeta-demo.io",
      name: "Priya Sharma",
      picture: "https://api.dicebear.com/7.x/initials/svg?seed=Priya",
    },
  });

  const arjun = await prisma.user.upsert({
    where: { auth0Sub: "auth0|seed_user_arjun" },
    update: {},
    create: {
      auth0Sub: "auth0|seed_user_arjun",
      email: "arjun.mehta@zeta-demo.io",
      name: "Arjun Mehta",
      picture: "https://api.dicebear.com/7.x/initials/svg?seed=Arjun",
    },
  });

  const ayush = await prisma.user.upsert({
    where: { auth0Sub: "auth0|seed_user_ayush" },
    update: { email: "ayush421301@gmail.com" },
    create: {
      auth0Sub: "auth0|seed_user_ayush",
      email: "ayush421301@gmail.com",
      name: "Ayush",
      picture: "https://api.dicebear.com/7.x/initials/svg?seed=Ayush",
    },
  });

  const swapnil = await prisma.user.upsert({
    where: { auth0Sub: "auth0|seed_user_swapnil" },
    update: { email: "patilswapnilsubhash@gmail.com" },
    create: {
      auth0Sub: "auth0|seed_user_swapnil",
      email: "patilswapnilsubhash@gmail.com",
      name: "Swapnil Patil",
      picture: "https://api.dicebear.com/7.x/initials/svg?seed=Swapnil",
    },
  });

  console.log("✅ Users created:", sumeet.id, priya.id, arjun.id, ayush.id, swapnil.id);

  // ── Integration Credentials ───────────────────────────────────────────────

  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: sumeet.id, provider: "google_workspace" } },
    update: {},
    create: {
      userId: sumeet.id,
      provider: "google_workspace",
      accessTokenEnc: "enc_fake_access_token_sumeet_google",
      refreshTokenEnc: "enc_fake_refresh_token_sumeet_google",
      tokenExpiry: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      providerEmail: "sumeet@zeta-demo.io",
      providerScopes: "gmail.readonly,drive.readonly",
      isActive: true,
    },
  });

  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: sumeet.id, provider: "slack" } },
    update: {},
    create: {
      userId: sumeet.id,
      provider: "slack",
      accessTokenEnc: "enc_fake_access_token_sumeet_slack",
      refreshTokenEnc: null,
      providerEmail: "sumeet@zeta-demo.io",
      providerTeamId: "T04SEED001",
      providerTeamName: "Zeta Demo Workspace",
      providerScopes: "channels:history,channels:read,users:read",
      isActive: true,
    },
  });

  // Expired credential — edge case: expired token should be refreshed
  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: priya.id, provider: "google_workspace" } },
    update: {},
    create: {
      userId: priya.id,
      provider: "google_workspace",
      accessTokenEnc: "enc_fake_access_token_priya_google_expired",
      refreshTokenEnc: "enc_fake_refresh_token_priya_google",
      tokenExpiry: new Date(Date.now() - 1000 * 60 * 60), // expired 1 hour ago
      providerEmail: "priya.sharma@zeta-demo.io",
      providerScopes: "gmail.readonly",
      isActive: true,
    },
  });

  // Inactive credential — edge case: disconnected integration
  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: arjun.id, provider: "slack" } },
    update: {},
    create: {
      userId: arjun.id,
      provider: "slack",
      accessTokenEnc: "enc_fake_access_token_arjun_slack",
      refreshTokenEnc: null,
      providerEmail: "arjun.mehta@zeta-demo.io",
      providerTeamId: "T04SEED002",
      providerTeamName: "Arjun Test Workspace",
      providerScopes: "channels:history",
      isActive: false, // disconnected
    },
  });

  // Ayush — Google + Slack both active
  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: ayush.id, provider: "google_workspace" } },
    update: {},
    create: {
      userId: ayush.id,
      provider: "google_workspace",
      accessTokenEnc: "enc_fake_access_token_ayush_google",
      refreshTokenEnc: "enc_fake_refresh_token_ayush_google",
      tokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
      providerEmail: "ayush421301@gmail.com",
      providerScopes: "gmail.readonly,drive.readonly",
      isActive: true,
    },
  });

  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: ayush.id, provider: "slack" } },
    update: {},
    create: {
      userId: ayush.id,
      provider: "slack",
      accessTokenEnc: "enc_fake_access_token_ayush_slack",
      refreshTokenEnc: null,
      providerEmail: "ayush421301@gmail.com",
      providerTeamId: "T04SEED001",
      providerTeamName: "Zeta Demo Workspace",
      providerScopes: "channels:history,channels:read,users:read",
      isActive: true,
    },
  });

  // Swapnil — only Google connected (Slack not connected yet)
  await prisma.integrationCredential.upsert({
    where: { userId_provider: { userId: swapnil.id, provider: "google_workspace" } },
    update: {},
    create: {
      userId: swapnil.id,
      provider: "google_workspace",
      accessTokenEnc: "enc_fake_access_token_swapnil_google",
      refreshTokenEnc: "enc_fake_refresh_token_swapnil_google",
      tokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 3), // 3 hours from now
      providerEmail: "patilswapnilsubhash@gmail.com",
      providerScopes: "gmail.readonly,drive.readonly",
      isActive: true,
    },
  });

  console.log("✅ Integration credentials created");

  // ── Slack Messages ────────────────────────────────────────────────────────

  const slackMessages = [
    {
      eventId: "Ev_SEED_001",
      teamId: "T04SEED001",
      channelId: "C04SEED01",
      slackUserId: "U04SEED01",
      text: "After evaluating cost and support SLAs, we're moving to AWS. GCP was 30% more expensive at our projected scale. Priya and I signed off. Migration starts next sprint.",
      ts: "1704856800.000100",
      threadTs: "1704856800.000100",
    },
    {
      eventId: "Ev_SEED_002",
      teamId: "T04SEED001",
      channelId: "C04SEED01",
      slackUserId: "U04SEED02",
      text: "Agreed. Also confirmed Neo4j works better on AWS — native AMI available. Let's lock this in.",
      ts: "1704856900.000200",
      threadTs: "1704856800.000100", // reply in same thread
    },
    {
      eventId: "Ev_SEED_003",
      teamId: "T04SEED001",
      channelId: "C04SEED02",
      slackUserId: "U04SEED01",
      text: "Auth strategy finalized — going with Auth0 over Cognito. Auth0 wins on DX and social login. Aditya and Sumeet agreed.",
      ts: "1704943200.000300",
      threadTs: "1704943200.000300",
    },
    {
      // Edge case: message with no thread (standalone)
      eventId: "Ev_SEED_004",
      teamId: "T04SEED001",
      channelId: "C04SEED03",
      slackUserId: "U04SEED03",
      text: "ok standup in 5 mins @here",
      ts: "1705029600.000400",
      threadTs: null, // no thread
    },
    {
      // Edge case: very long message
      eventId: "Ev_SEED_005",
      teamId: "T04SEED001",
      channelId: "C04SEED02",
      slackUserId: "U04SEED01",
      text: "Cutting GitHub ingestion from MVP scope. After the standup today, we decided to drop GitHub ingestion from v1. Slack + Gmail covers 80% of decisions. GitHub adds complexity with PR parsing and we don't have bandwidth before the demo. Rahul and Priya agreed. We'll revisit post-hackathon. The main reasons are: (1) timeline pressure, (2) overlapping signal with Slack, (3) PR parsing is non-trivial and error-prone without a good test corpus.",
      ts: "1705116000.000500",
      threadTs: "1705116000.000500",
    },
  ];

  // Extra Slack messages for Ayush (same workspace, different user perspective)
  const ayushSlackMessages = [
    {
      eventId: "Ev_SEED_006",
      teamId: "T04SEED001",
      channelId: "C04SEED01",
      slackUserId: "U04AYUSH01",
      text: "Ayush here — I've reviewed the AWS migration plan. Looks solid. One concern: we need to migrate the Redis cluster too, not just the app servers. Sumeet can you confirm that's in scope?",
      ts: "1704857000.000600",
      threadTs: "1704856800.000100",
    },
    {
      eventId: "Ev_SEED_007",
      teamId: "T04SEED001",
      channelId: "C04SEED04",
      slackUserId: "U04AYUSH01",
      text: "Frontend framework decision: we're going with React + Vite over Next.js. Reason — we don't need SSR for the MVP, and Vite's HMR is significantly faster for dev iteration. Swapnil agreed.",
      ts: "1705200000.000700",
      threadTs: "1705200000.000700",
    },
  ];

  // Extra Slack messages for Swapnil
  const swapnilSlackMessages = [
    {
      eventId: "Ev_SEED_008",
      teamId: "T04SEED001",
      channelId: "C04SEED04",
      slackUserId: "U04SWAPNIL01",
      text: "Agreed on React + Vite. Also decided to use TailwindCSS over MUI — Tailwind gives us more flexibility for custom design and the bundle size is smaller. Ayush signed off.",
      ts: "1705200100.000800",
      threadTs: "1705200000.000700",
    },
    {
      eventId: "Ev_SEED_009",
      teamId: "T04SEED001",
      channelId: "C04SEED05",
      slackUserId: "U04SWAPNIL01",
      text: "Deployment decision: using Railway for backend and Vercel for frontend. Cheaper than AWS for MVP stage, zero-config deploys. Will migrate to AWS post-launch if needed. Team agreed.",
      ts: "1705286400.000900",
      threadTs: "1705286400.000900",
    },
  ];

  for (const msg of slackMessages) {
    await prisma.slackMessage.upsert({
      where: { eventId: msg.eventId },
      update: {},
      create: {
        userId: sumeet.id,
        eventId: msg.eventId,
        teamId: msg.teamId,
        channelId: msg.channelId,
        slackUserId: msg.slackUserId,
        text: msg.text,
        ts: msg.ts,
        threadTs: msg.threadTs,
        rawPayload: {
          type: "event_callback",
          team_id: msg.teamId,
          event: {
            type: "message",
            channel: msg.channelId,
            user: msg.slackUserId,
            text: msg.text,
            ts: msg.ts,
            thread_ts: msg.threadTs,
          },
        },
      },
    });
  }

  for (const msg of ayushSlackMessages) {
    await prisma.slackMessage.upsert({
      where: { eventId: msg.eventId },
      update: {},
      create: {
        userId: ayush.id,
        eventId: msg.eventId,
        teamId: msg.teamId,
        channelId: msg.channelId,
        slackUserId: msg.slackUserId,
        text: msg.text,
        ts: msg.ts,
        threadTs: msg.threadTs,
        rawPayload: {
          type: "event_callback",
          team_id: msg.teamId,
          event: { type: "message", channel: msg.channelId, user: msg.slackUserId, text: msg.text, ts: msg.ts, thread_ts: msg.threadTs },
        },
      },
    });
  }

  for (const msg of swapnilSlackMessages) {
    await prisma.slackMessage.upsert({
      where: { eventId: msg.eventId },
      update: {},
      create: {
        userId: swapnil.id,
        eventId: msg.eventId,
        teamId: msg.teamId,
        channelId: msg.channelId,
        slackUserId: msg.slackUserId,
        text: msg.text,
        ts: msg.ts,
        threadTs: msg.threadTs,
        rawPayload: {
          type: "event_callback",
          team_id: msg.teamId,
          event: { type: "message", channel: msg.channelId, user: msg.slackUserId, text: msg.text, ts: msg.ts, thread_ts: msg.threadTs },
        },
      },
    });
  }

  console.log("✅ Slack messages created:", slackMessages.length + ayushSlackMessages.length + swapnilSlackMessages.length);

  // ── Gmail Messages ────────────────────────────────────────────────────────

  const gmailMessages = [
    {
      gmailMessageId: "gmail_seed_001",
      threadId: "thread_seed_001",
      subject: "Decision: Moving primary infra to AWS from GCP",
      from: "arjun.mehta@zeta-demo.io",
      to: "engineering@zeta-demo.io",
      date: "Mon, 15 Jan 2024 10:30:00 +0530",
      snippet: "After evaluating cost and support SLAs, we're moving to AWS...",
      bodyText: `Hi team,

After evaluating cost and support SLAs, we're moving to AWS. GCP was 30% more expensive at our projected scale and AWS has better support for our Neo4j setup. Sumeet and Priya signed off. Migration starts next sprint.

Best,
Arjun`,
      labelIds: ["INBOX", "UNREAD"],
    },
    {
      gmailMessageId: "gmail_seed_002",
      threadId: "thread_seed_001",
      subject: "Re: Decision: Moving primary infra to AWS from GCP",
      from: "priya.sharma@zeta-demo.io",
      to: "engineering@zeta-demo.io",
      date: "Mon, 15 Jan 2024 11:00:00 +0530",
      snippet: "Confirmed. Also checked the pricing calculator...",
      bodyText: `Hi Arjun,

Confirmed. Also checked the pricing calculator — we save approximately ₹2.4L/month at our scale. I've already started the migration checklist. Sumeet will review by EOD.

Thanks,
Priya`,
      labelIds: ["INBOX"],
    },
    {
      gmailMessageId: "gmail_seed_003",
      threadId: "thread_seed_002",
      subject: "Re: Payment gateway — going with Razorpay, not Stripe",
      from: "priya.sharma@zeta-demo.io",
      to: "product@zeta-demo.io",
      date: "Thu, 18 Jan 2024 14:15:00 +0530",
      snippet: "Stripe doesn't support INR settlements without a US entity...",
      bodyText: `Hi team,

Stripe doesn't support INR settlements without a US entity. Razorpay covers UPI, cards, and net banking natively. Rohan from finance confirmed this unblocks the India launch. Decision is final.

Thanks,
Priya`,
      labelIds: ["INBOX"],
    },
    {
      // Edge case: email with no body (only snippet)
      gmailMessageId: "gmail_seed_004",
      threadId: "thread_seed_003",
      subject: "Quick sync tomorrow?",
      from: "arjun.mehta@zeta-demo.io",
      to: "sumeet@zeta-demo.io",
      date: "Fri, 19 Jan 2024 09:00:00 +0530",
      snippet: "Hey, can we sync tomorrow at 10am about the Neo4j setup?",
      bodyText: null, // edge case: no body extracted
      labelIds: ["INBOX", "UNREAD"],
    },
    {
      gmailMessageId: "gmail_seed_005",
      threadId: "thread_seed_004",
      subject: "Neo4j confirmed as our graph DB for decision tracking",
      from: "sumeet@zeta-demo.io",
      to: "team@zeta-demo.io",
      date: "Mon, 22 Jan 2024 16:20:00 +0530",
      snippet: "After testing Dgraph and Neptune, Neo4j was the clearest winner...",
      bodyText: `Hi everyone,

After testing Dgraph and Neptune, Neo4j was the clearest winner — Cypher queries are readable, community is strong, and the local Docker setup is trivial. ChromaDB handles vector search alongside it. This is locked in.

Thanks,
Sumeet`,
      labelIds: ["SENT"],
    },
  ];

  // Gmail messages for Ayush
  const ayushGmailMessages = [
    {
      gmailMessageId: "gmail_ayush_001",
      threadId: "thread_ayush_001",
      subject: "Frontend stack finalized: React + Vite + TailwindCSS",
      from: "ayush421301@gmail.com",
      to: "team@zeta-demo.io",
      date: "Thu, 25 Jan 2024 10:00:00 +0530",
      snippet: "After evaluating Next.js vs React+Vite, we're going with React+Vite...",
      bodyText: `Hi team,

After evaluating Next.js vs React+Vite, we're going with React+Vite for the frontend. No SSR needed for MVP, and Vite's HMR is 3x faster. TailwindCSS over MUI for flexibility. Swapnil agreed on the call.

Best,
Ayush`,
      labelIds: ["SENT"],
    },
    {
      gmailMessageId: "gmail_ayush_002",
      threadId: "thread_ayush_002",
      subject: "Re: Deployment strategy for demo",
      from: "ayush421301@gmail.com",
      to: "swapnil@zeta-demo.io",
      date: "Fri, 26 Jan 2024 15:30:00 +0530",
      snippet: "Railway for backend makes sense, zero config and free tier covers us...",
      bodyText: `Hey Swapnil,

Railway for backend makes sense, zero config and free tier covers us for demo. Vercel for frontend is obvious. Let's go with this. No point over-engineering infra for a hackathon.

Cheers,
Ayush`,
      labelIds: ["SENT"],
    },
  ];

  // Gmail messages for Swapnil
  const swapnilGmailMessages = [
    {
      gmailMessageId: "gmail_swapnil_001",
      threadId: "thread_swapnil_001",
      subject: "Cutting GitHub ingestion from MVP scope",
      from: "patilswapnilsubhash@gmail.com",
      to: "team@zeta-demo.io",
      date: "Thu, 25 Jan 2024 11:00:00 +0530",
      snippet: "After the standup, we're dropping GitHub ingestion from v1...",
      bodyText: `Hi team,

After the standup today, we're dropping GitHub ingestion from v1. Slack + Gmail covers 80% of decisions. GitHub adds complexity with PR parsing and we don't have time before the demo. Revisit post-hackathon. Rahul and Ayush agreed.

Best,
Swapnil`,
      labelIds: ["INBOX"],
    },
  ];

  for (const msg of ayushGmailMessages) {
    await prisma.gmailMessage.upsert({
      where: { userId_gmailMessageId: { userId: ayush.id, gmailMessageId: msg.gmailMessageId } },
      update: {},
      create: {
        userId: ayush.id,
        gmailMessageId: msg.gmailMessageId,
        threadId: msg.threadId,
        subject: msg.subject,
        from: msg.from,
        to: msg.to,
        date: msg.date,
        snippet: msg.snippet,
        bodyText: msg.bodyText,
        labelIds: msg.labelIds,
      },
    });
  }

  for (const msg of swapnilGmailMessages) {
    await prisma.gmailMessage.upsert({
      where: { userId_gmailMessageId: { userId: swapnil.id, gmailMessageId: msg.gmailMessageId } },
      update: {},
      create: {
        userId: swapnil.id,
        gmailMessageId: msg.gmailMessageId,
        threadId: msg.threadId,
        subject: msg.subject,
        from: msg.from,
        to: msg.to,
        date: msg.date,
        snippet: msg.snippet,
        bodyText: msg.bodyText,
        labelIds: msg.labelIds,
      },
    });
  }

  for (const msg of gmailMessages) {
    await prisma.gmailMessage.upsert({
      where: { userId_gmailMessageId: { userId: sumeet.id, gmailMessageId: msg.gmailMessageId } },
      update: {},
      create: {
        userId: sumeet.id,
        gmailMessageId: msg.gmailMessageId,
        threadId: msg.threadId,
        subject: msg.subject,
        from: msg.from,
        to: msg.to,
        date: msg.date,
        snippet: msg.snippet,
        bodyText: msg.bodyText,
        labelIds: msg.labelIds,
      },
    });
  }

  console.log("✅ Gmail messages created:", gmailMessages.length + ayushGmailMessages.length + swapnilGmailMessages.length);

  // ── Drive Extractions ─────────────────────────────────────────────────────

  await prisma.driveExtraction.createMany({
    skipDuplicates: true,
    data: [
      {
        userId: ayush.id,
        displayName: "Frontend Architecture Decisions — Jan 2024",
        sourceFileIds: ["1frontend_doc_ayush"],
        sourcesJson: [
          { fileId: "1frontend_doc_ayush", name: "Frontend Stack Decision.gdoc", mimeType: "application/vnd.google-apps.document" },
        ],
        extractedText: `Frontend Stack Decision — January 2024

Participants: Ayush, Swapnil Patil

Decision: Use React + Vite + TailwindCSS for the frontend.

Rationale:
- No SSR needed for MVP dashboard
- Vite HMR is 3x faster than Create React App
- TailwindCSS provides more design flexibility than MUI
- Smaller bundle size vs MUI

Deployment: Vercel (zero-config, free tier sufficient for demo)`,
      },
      {
        userId: swapnil.id,
        displayName: "MVP Scope — What's In and Out",
        sourceFileIds: ["1mvp_scope_swapnil"],
        sourcesJson: [
          { fileId: "1mvp_scope_swapnil", name: "MVP Scope Doc.gdoc", mimeType: "application/vnd.google-apps.document" },
        ],
        extractedText: `MVP Scope Decision — January 2024

Participants: Swapnil Patil, Ayush, Sumeet

In scope for v1:
- Slack ingestion (real-time webhook)
- Gmail ingestion (OAuth pull)
- Google Drive ingestion (manual trigger)
- Decision extraction via LLM
- Neo4j graph storage
- Basic query interface

Out of scope for v1:
- GitHub ingestion (deferred — PR parsing complexity)
- Notion ingestion (deferred)
- Real-time graph visualization
- Multi-org support

Reason for cuts: Timeline pressure, hackathon deadline Jan 31.`,
      },
    ],
  });

  await prisma.driveExtraction.create({
    data: {
      userId: sumeet.id,
      displayName: "Q1 2024 Architecture Decisions",
      sourceFileIds: ["1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", "1abc123defg"],
      sourcesJson: [
        { fileId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", name: "Architecture Decision Record - AWS.gdoc", mimeType: "application/vnd.google-apps.document" },
        { fileId: "1abc123defg", name: "Infra Cost Comparison.gdoc", mimeType: "application/vnd.google-apps.document" },
      ],
      extractedText: `Architecture Decision Record — AWS Migration

Date: January 2024
Participants: Sumeet, Priya Sharma, Arjun Mehta

Decision: Migrate primary infrastructure from GCP to AWS.

Rationale:
- AWS is 30% cheaper at our projected scale (verified via pricing calculator)
- Better native support for Neo4j AMI
- AWS support SLAs are stronger for our tier

Next steps:
1. Sumeet to review migration checklist by EOD Jan 15
2. Priya to begin staging environment setup
3. Full cutover planned for sprint 3`,
    },
  });

  console.log("✅ Drive extractions created");

  console.log("\n🎉 Seed complete!");
  console.log("──────────────────────────────────────────────────────");
  console.log("Users:                  5  (sumeet, ayush, swapnil, priya, arjun)");
  console.log("  sumeet  → arigatoforest@gmail.com       (Google + Slack active)");
  console.log("  ayush   → ayush421301@gmail.com         (Google + Slack active)");
  console.log("  swapnil → patilswapnilsubhash@gmail.com (Google active, Slack not connected)");
  console.log("  priya   → priya.sharma@zeta-demo.io     (Google expired token)");
  console.log("  arjun   → arjun.mehta@zeta-demo.io      (Slack inactive/disconnected)");
  console.log("");
  console.log("Integration credentials: 6  (3 active, 1 expired, 1 inactive, 1 missing)");
  console.log("Slack messages:         9  (thread, reply, noise, long, per-user)");
  console.log("Gmail messages:         8  (thread replies, no-body, per-user)");
  console.log("Drive extractions:      3  (sumeet, ayush, swapnil)");
  console.log("──────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
