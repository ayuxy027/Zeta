# Gmail Integration Prerequisites and Implementation Guide

## Goal

Build a consent-based Gmail integration so your app can securely read a user's emails after explicit permission.

This guide is written so you can copy the flow into another project quickly.

---

## 1) High-Level Audit (Current Workspace)

What this repository already has:
- Google OAuth token refresh support in backend services.
- A Gmail service for sending emails and verifying Gmail access.
- Authenticated email-related API routing and controllers.

What is missing for "read user emails":
- Explicit Gmail read scopes in a dedicated OAuth flow.
- Backend endpoints that call `gmail.users.messages.list` and `gmail.users.messages.get`.
- Consent UX text and permission explanation tailored for inbox read access.
- Production compliance checks (Google app verification path if needed).

---

## 2) Prerequisites

### Google Cloud Setup

1. Create or select a Google Cloud project.
2. Enable APIs:
- Gmail API
- (Optional) People API if you want profile details
3. Configure OAuth consent screen:
- App name, support email, developer email
- Authorized domains
- Privacy policy URL and terms URL (required for production)
4. Add OAuth scopes (minimum required):
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.readonly` (read-only inbox access)
5. Create OAuth 2.0 credentials (Web application):
- Authorized redirect URI example: `https://your-api.com/auth/google/callback`
- Local dev URI example: `http://localhost:3001/auth/google/callback`

### App Verification Notes

- `gmail.readonly` is a sensitive/restricted class scope in many cases.
- Internal apps (Google Workspace internal users only) are simpler.
- External apps often require verification before broad production rollout.
- During development, add test users in consent screen config.

### Environment Variables

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_ENCRYPTION_KEY=32_byte_random_key_for_token_encryption
```

Generate a strong key:

```bash
openssl rand -hex 32
```

---

## 3) Consent-First Architecture

Recommended flow:

1. User clicks "Connect Gmail".
2. Backend generates Google OAuth URL with minimum required scopes.
3. User approves consent on Google screen.
4. Google redirects with authorization code.
5. Backend exchanges code for tokens.
6. Store encrypted refresh token, access token expiry, granted scopes.
7. Use access token to list/read messages.
8. Refresh token automatically when access token expires.
9. User can disconnect and revoke access anytime.

---

## 4) Node.js Implementation Snippets (Express + googleapis)

Install dependencies:

```bash
npm install googleapis express
```

Optional for encryption helper:

```bash
npm install crypto-js
```

### 4.1 OAuth Client Helper

```js
// gmailOAuth.js
const { google } = require("googleapis");

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

module.exports = { createOAuthClient };
```

### 4.2 Connect Route (Generate Consent URL)

```js
// routes/authGoogle.js
const express = require("express");
const router = express.Router();
const { createOAuthClient } = require("../gmailOAuth");

router.get("/auth/google/connect", (req, res) => {
  const oauth2Client = createOAuthClient();

  // CSRF protection token (store this in session/redis and validate on callback)
  const state = "secure_random_state";

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // needed for refresh_token
    prompt: "consent", // ensures refresh_token in many cases
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    include_granted_scopes: true,
    state,
  });

  return res.json({ url });
});

module.exports = router;
```

### 4.3 Callback Route (Exchange Code for Tokens)

```js
// routes/authGoogleCallback.js
const express = require("express");
const router = express.Router();
const { createOAuthClient } = require("../gmailOAuth");

router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    // Validate state here against stored value
    // if (state !== expectedState) return res.status(403).json({ error: "Invalid state" });

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // tokens may include:
    // access_token, refresh_token, expiry_date, scope, token_type
    if (!tokens.access_token) {
      return res.status(400).json({ error: "Missing access token" });
    }

    // IMPORTANT: persist securely by user id
    // await tokenStore.save(userId, tokens);

    return res.json({
      success: true,
      grantedScopes: tokens.scope,
      expiresAt: tokens.expiry_date,
      hasRefreshToken: Boolean(tokens.refresh_token),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### 4.4 Secure Token Storage (Example)

```js
// tokenCrypto.js
const crypto = require("crypto");

const ENC_ALGO = "aes-256-gcm";
const ENC_KEY = Buffer.from(process.env.GOOGLE_ENCRYPTION_KEY, "hex");

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(payload) {
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
```

Store these per user:
- encrypted `refresh_token`
- latest `access_token` (optional cache)
- `expiry_date`
- granted `scope`
- token `updated_at`

### 4.5 Build Gmail Client Per User

```js
// gmailClient.js
const { google } = require("googleapis");
const { createOAuthClient } = require("./gmailOAuth");

async function getGmailForUser(userTokens) {
  const oauth2Client = createOAuthClient();

  oauth2Client.setCredentials({
    access_token: userTokens.accessToken,
    refresh_token: userTokens.refreshToken,
    expiry_date: userTokens.expiryDate,
  });

  // Optional: capture refreshed tokens automatically
  oauth2Client.on("tokens", async (newTokens) => {
    // await tokenStore.merge(userId, newTokens)
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

module.exports = { getGmailForUser };
```

### 4.6 List User Emails

```js
// services/gmailReadService.js
async function listEmails(gmail, { query = "", maxResults = 20, pageToken } = {}) {
  const resp = await gmail.users.messages.list({
    userId: "me",
    q: query, // examples: "is:unread", "from:billing@x.com", "newer_than:7d"
    maxResults,
    pageToken,
  });

  const messages = resp.data.messages || [];
  return {
    messages,
    nextPageToken: resp.data.nextPageToken || null,
    resultSizeEstimate: resp.data.resultSizeEstimate || 0,
  };
}

module.exports = { listEmails };
```

### 4.7 Get Full Email Content

```js
function headerValue(headers = [], name) {
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : "";
}

function decodeBase64Url(input = "") {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractText(payload) {
  if (!payload) return "";

  if (payload.body && payload.body.data && payload.mimeType === "text/plain") {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && payload.parts.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
  }

  return "";
}

async function getEmailById(gmail, messageId) {
  const resp = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const msg = resp.data;
  const headers = msg.payload?.headers || [];

  return {
    id: msg.id,
    threadId: msg.threadId,
    snippet: msg.snippet,
    internalDate: msg.internalDate,
    subject: headerValue(headers, "Subject"),
    from: headerValue(headers, "From"),
    to: headerValue(headers, "To"),
    date: headerValue(headers, "Date"),
    bodyText: extractText(msg.payload),
  };
}

module.exports = { getEmailById };
```

### 4.8 API Endpoints for Your App

```js
// routes/gmailRoutes.js
const express = require("express");
const router = express.Router();
const { getGmailForUser } = require("../gmailClient");
const { listEmails } = require("../services/gmailReadService");
const { getEmailById } = require("../services/gmailReadService");

router.get("/gmail/messages", async (req, res) => {
  try {
    const userTokens = await tokenStore.get(req.user.id); // implement
    if (!userTokens) return res.status(401).json({ error: "Gmail not connected" });

    const gmail = await getGmailForUser(userTokens);
    const result = await listEmails(gmail, {
      query: req.query.q || "",
      maxResults: Number(req.query.maxResults || 20),
      pageToken: req.query.pageToken,
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/gmail/messages/:id", async (req, res) => {
  try {
    const userTokens = await tokenStore.get(req.user.id); // implement
    if (!userTokens) return res.status(401).json({ error: "Gmail not connected" });

    const gmail = await getGmailForUser(userTokens);
    const result = await getEmailById(gmail, req.params.id);

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## 5) Consent UX Copy (Recommended)

Show this before redirecting to Google:

- We request read-only Gmail access to fetch your selected emails.
- We never send emails without your action.
- You can disconnect anytime from Settings.
- We only store tokens securely and fetch data required for requested features.

This improves trust and helps review readiness.

---

## 6) Security and Compliance Checklist

- Use least-privilege scopes (`gmail.readonly` instead of modify/send if not needed).
- Always include CSRF `state` in OAuth flow.
- Encrypt refresh tokens at rest.
- Never log access tokens, refresh tokens, or raw email bodies in production logs.
- Add per-user authorization check on every Gmail read endpoint.
- Add rate limiting on Gmail proxy endpoints.
- Add disconnect endpoint to revoke token and delete stored credentials.

Revoke endpoint pattern:

```js
async function revokeGoogleToken(token) {
  const url = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-type": "application/x-www-form-urlencoded" },
  });
}
```

---

## 7) Optional: Real-Time Sync (Push)

If you need near real-time updates:

1. Call Gmail watch endpoint with Pub/Sub topic.
2. Receive notifications in webhook/subscriber.
3. Use `historyId` with `users.history.list` to fetch changes.

This is advanced but reduces polling cost.

---

## 8) Testing Plan

1. Connect Gmail with test Google account.
2. Confirm callback stores refresh token.
3. Call list endpoint: verify message IDs returned.
4. Call message detail endpoint: verify subject/sender/body parsing.
5. Expire token manually and verify automatic refresh.
6. Disconnect and verify further reads fail with 401.

---

## 9) Common Pitfalls

- No `refresh_token` returned:
  - Use `access_type=offline` and `prompt=consent`.
- Redirect URI mismatch:
  - Ensure exact match in Google console and env.
- Insufficient scope errors:
  - User previously granted fewer scopes; force reconnect.
- Token overwrite bugs:
  - Keep old refresh token if new token response omits it.

---

## 10) Minimal Integration Checklist (Copy/Paste)

- [ ] Enable Gmail API in Google Cloud
- [ ] Configure OAuth consent screen and test users
- [ ] Create OAuth credentials and redirect URIs
- [ ] Add env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
- [ ] Implement connect route (generate auth URL)
- [ ] Implement callback route (exchange code, store tokens)
- [ ] Encrypt and store refresh tokens
- [ ] Implement `GET /gmail/messages` and `GET /gmail/messages/:id`
- [ ] Add token refresh handling
- [ ] Add disconnect + revoke flow
- [ ] Add audit-safe logging and security checks

---

## 11) Scope Guidance for Different Use Cases

Use only what you need:

- Read only:
  - `https://www.googleapis.com/auth/gmail.readonly`
- Read + metadata only:
  - `https://www.googleapis.com/auth/gmail.metadata`
- Send only:
  - `https://www.googleapis.com/auth/gmail.send`

Avoid broad scope combinations unless feature requirements demand them.

---

This document is designed as a base prerequisite pack for your next project. You can lift sections 2, 3, and 4 directly into implementation tickets.
