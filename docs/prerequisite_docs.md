# Google Docs Integration Prerequisites and Implementation Guide

## Purpose
This document is a complete handoff for implementing Google Docs integration in another project.

It covers:
- What this project already does.
- What is missing if you want true "view and retrieve" from Google Docs.
- Prerequisites in Google Cloud.
- Backend and frontend API design.
- Secure token handling.
- Database schema and operational checklist.

---

## 1) Audit Summary of Current Project

### What is implemented here
1. Frontend authenticates user with Google OAuth using `@react-oauth/google` and `useGoogleLogin` (implicit flow).
2. Frontend receives Google access token and stores it in localStorage.
3. Frontend can create a Google Doc using Google Docs API.
4. Backend also exposes endpoint to create a Google Doc if access token is passed from client.
5. App stores document references in Supabase (`doc_id`, `doc_url`, `title`) and/or stores generated content in `user_documents`.
6. App can list user's previously saved document records from Supabase.

### Important gap for your new project goal
Your requirement is to "view docs of user and retrieve them".

In this codebase, retrieval is primarily from database records, not from Google Docs API content fetch.
- It retrieves metadata you saved (`doc_id`, `doc_url`, etc.).
- It does not implement full Google Drive listing + Google Docs content extraction pipeline for arbitrary user docs.

So for your new project, you should implement two layers:
1. App DB layer (cache/index your known docs).
2. Direct Google API retrieval layer (list docs from Drive and fetch actual doc content).

---

## 2) Google Cloud Prerequisites

Set up in Google Cloud Console before coding.

### 2.1 Create project and OAuth consent
1. Create/select a Google Cloud project.
2. Configure OAuth consent screen.
3. Add test users (if app is in testing mode).
4. Add required scopes.

### 2.2 Enable APIs
Enable both APIs:
1. Google Docs API
2. Google Drive API

### 2.3 Create OAuth credentials
Create OAuth 2.0 Client IDs:
1. Web client for frontend login (if browser login).
2. Optional separate server client if doing server-side authorization code flow.

### 2.4 Authorized origins and redirects
Configure exactly:
1. Frontend origins: e.g. `http://localhost:5173`, production domain.
2. Redirect URIs for Authorization Code flow callback endpoint.

If redirect URIs do not match exactly, OAuth will fail.

---

## 3) Required OAuth Scopes

Use minimum scopes needed.

### For creating and editing docs
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/drive.file`

### For listing user docs from Drive
- `https://www.googleapis.com/auth/drive.metadata.readonly`

### For reading full document content
At least one of:
- `https://www.googleapis.com/auth/documents.readonly`
- or broader Drive read scope if your access model requires it.

Recommended for your use case (create + retrieve):
- `documents`
- `documents.readonly`
- `drive.metadata.readonly`
- `drive.file` (if only app-created files are managed)

Note:
- `drive.file` only guarantees access to files created/opened by your app.
- If you must list/read all docs user can access, you need broader read scopes and stricter review/security.

---

## 4) Environment Variables You Need

### Frontend
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_BACKEND_URL`

### Backend
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `FRONTEND_URL`

Optional but recommended:
- `GOOGLE_OAUTH_ENCRYPTION_KEY` (if encrypting refresh tokens yourself)

---

## 5) Data Model (Supabase / SQL)

Use two tables minimum.

### 5.1 Token storage (recommended)
Store refresh tokens server-side per user/provider.

Example table: `oauth_google_tokens`
- `id` uuid pk
- `user_id` uuid/text
- `google_sub` text
- `email` text
- `refresh_token` text (encrypted)
- `access_token` text (optional cache)
- `expires_at` timestamptz (optional cache)
- `scope` text
- `created_at` timestamptz
- `updated_at` timestamptz

### 5.2 Document index/cache
Example table: `user_google_docs`
- `id` uuid pk
- `user_id` uuid/text
- `doc_id` text unique per user
- `doc_url` text
- `title` text
- `mime_type` text
- `last_synced_at` timestamptz
- `created_at` timestamptz

### Existing project note
This project already uses `user_google_docs` style records and `user_documents`, but no durable refresh-token lifecycle is fully implemented.

---

## 6) Recommended Architecture for Your New Project

Use backend-managed OAuth and Google API calls.

1. Frontend starts OAuth Authorization Code flow (PKCE preferred).
2. Backend callback exchanges code for access + refresh token.
3. Backend stores refresh token securely.
4. Frontend never stores long-lived refresh token.
5. Frontend calls your backend endpoints only.
6. Backend refreshes access token when needed and calls Google APIs.

Why this is better than current implicit token approach:
- Better security (no long-term token in browser storage).
- Supports background sync/listing without user re-login every short interval.
- Easier to audit and revoke.

---

## 7) API Endpoints to Build (Reference Contract)

### 7.1 OAuth
1. `GET /api/google/oauth/url`
- returns URL and state for consent.

2. `GET /api/google/oauth/callback?code=...&state=...`
- exchanges code for tokens.
- stores refresh token mapped to your app user.

3. `POST /api/google/oauth/disconnect`
- revokes token and deletes stored credentials.

### 7.2 Docs operations
1. `POST /api/google/docs`
- Create Google Doc.
- Body: `{ title, content }`
- Backend uses user token, calls Docs API, stores metadata.

2. `GET /api/google/docs/list`
- List Google Docs from Drive API.
- Query examples: `pageSize`, `pageToken`, `q`.

3. `GET /api/google/docs/:docId`
- Fetch full document structure via Docs API.
- Return parsed plain text + structural JSON if needed.

4. `GET /api/google/docs/:docId/export/txt`
- Optional convenience endpoint that returns plain text.

5. `DELETE /api/google/docs/:docId`
- Optional Drive delete.

---

## 8) Google API Calls for Retrieval (Core Logic)

### 8.1 List user docs (Drive API)
Use files.list filtering Google Docs mime type:

- Endpoint:
  `GET https://www.googleapis.com/drive/v3/files`

- Typical query params:
  - `q=mimeType='application/vnd.google-apps.document' and trashed=false`
  - `fields=nextPageToken,files(id,name,createdTime,modifiedTime,webViewLink,owners(emailAddress,displayName))`
  - `pageSize=50`

### 8.2 Retrieve a document (Docs API)
- Endpoint:
  `GET https://docs.googleapis.com/v1/documents/{documentId}`

This returns structural JSON (`body.content` etc.).

### 8.3 Convert Docs structural JSON to plain text
Important because UI often needs extracted text.

Pseudo logic:
1. Iterate through `document.body.content`.
2. For each paragraph, collect text runs (`textRun.content`).
3. Keep newline boundaries between blocks.
4. Optional: preserve headings/lists by prefix markers.

---

## 9) Backend TypeScript Reference Snippets

### 9.1 List docs service

```ts
async function listGoogleDocs(accessToken: string, pageSize = 50, pageToken?: string) {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.document' and trashed=false",
    fields: "nextPageToken,files(id,name,createdTime,modifiedTime,webViewLink)",
    pageSize: String(pageSize),
  });

  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to list Google Docs");
  }

  return res.json();
}
```

### 9.2 Get document content service

```ts
async function getGoogleDoc(accessToken: string, docId: string) {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Failed to fetch Google Doc");
  }

  return res.json();
}
```

### 9.3 Extract plain text utility

```ts
type GoogleDoc = {
  body?: {
    content?: Array<{
      paragraph?: {
        elements?: Array<{
          textRun?: { content?: string };
        }>;
      };
    }>;
  };
};

function extractPlainText(doc: GoogleDoc): string {
  const parts: string[] = [];

  for (const block of doc.body?.content || []) {
    const paragraph = block.paragraph;
    if (!paragraph?.elements) continue;

    for (const el of paragraph.elements) {
      const text = el.textRun?.content;
      if (text) parts.push(text);
    }

    // Keep paragraph separation
    if (parts.length > 0 && !parts[parts.length - 1].endsWith("\n")) {
      parts.push("\n");
    }
  }

  return parts.join("").trim();
}
```

---

## 10) Frontend Flow for Another Project

1. User clicks "Connect Google Docs".
2. OAuth completes.
3. Frontend calls backend `/api/google/docs/list` to show docs.
4. User selects one doc.
5. Frontend calls `/api/google/docs/:docId`.
6. Render returned plain text and/or structured content.

Do not call Google APIs directly from frontend for production retrieval flow unless you intentionally accept token exposure tradeoffs.

---

## 11) Security and Compliance Checklist

1. Prefer Authorization Code + PKCE over implicit flow.
2. Never expose client secret in frontend.
3. Store refresh tokens encrypted at rest.
4. Restrict CORS to exact frontend origins.
5. Validate ownership mapping: app user -> stored Google token.
6. Add per-user rate limit on docs list/read endpoints.
7. Log only safe metadata, never full tokens.
8. Add disconnect/revoke flow.
9. Handle 401 by refreshing token; force reconnect if refresh invalid.

---

## 12) Error Handling You Must Implement

Handle these categories cleanly:
1. OAuth consent denied.
2. Missing/expired access token.
3. Revoked refresh token (`invalid_grant`).
4. Insufficient scopes (403).
5. Doc not found or no permission (404/403).
6. Quota exceeded (429).
7. Google API transient failures (5xx; retry with backoff).

---

## 13) Testing Plan

### Unit tests
1. Token refresh helper.
2. Drive list query builder.
3. Doc plain-text extraction utility.

### Integration tests
1. OAuth callback stores token correctly.
2. `/docs/list` returns docs with pagination.
3. `/docs/:docId` returns extracted text for accessible doc.
4. Revoked token path returns reconnect-required response.

### Manual tests
1. Connect account.
2. List existing docs.
3. Open selected doc and verify text accuracy.
4. Create new doc and verify it appears in list.
5. Disconnect and confirm access is blocked.

---

## 14) Mapping to This Project's Existing Code

What you can reuse directly:
1. Google Docs create call pattern (`docs.googleapis.com/v1/documents` + `batchUpdate`).
2. Express controller/route structure for Google endpoints.
3. Supabase service pattern for persisting doc references.
4. Frontend button/login interaction pattern with `@react-oauth/google`.

What to add for your next project:
1. Backend OAuth code exchange and refresh-token storage.
2. Drive docs listing endpoint.
3. Docs content retrieval endpoint.
4. Plain text extraction utility.
5. Optional sync job to cache user docs metadata.

---

## 15) Minimal Rollout Sequence (Recommended)

1. Implement backend OAuth code flow with token persistence.
2. Build `/docs/list` endpoint (Drive API).
3. Build `/docs/:docId` endpoint (Docs API + text extractor).
4. Add frontend list + open-doc UI.
5. Add token refresh/reconnect handling.
6. Add audit logging and rate limiting.

---

## 16) Final Practical Note

If your exact requirement is:
- "Only docs created by my app": `drive.file` + docs scopes are usually enough.
- "Any doc user owns/can access": you need broader read scopes and stronger consent/security posture.

Choose this early because it affects scopes, consent review, and UX wording.
