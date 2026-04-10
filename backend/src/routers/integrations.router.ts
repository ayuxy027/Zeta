import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import { google } from "googleapis";
import { signOAuthState, verifyOAuthState } from "../lib/oauthState.js";
import { encryptToken } from "../lib/tokenCrypto.js";
import { prisma } from "../lib/prisma.js";

const { requiresAuth } = oidc;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFrontendUrl(): string {
  return process.env.FRONTEND_URL?.trim() ?? "http://localhost:5173";
}

function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_PUBLIC_URL?.trim() ??
    process.env.AUTH0_BASE_URL?.trim() ??
    "http://localhost:3001"
  );
}

function getSlackRedirectBaseUrl(): string {
  return (
    process.env.SLACK_REDIRECT_BASE_URL?.trim() ??
    process.env.AUTH0_BASE_URL?.trim() ??
    getBackendBaseUrl()
  );
}

function getStateSecret(): string {
  const s = process.env.AUTH0_SECRET?.trim();
  if (!s) {
    throw new Error("AUTH0_SECRET is required for OAuth state signing.");
  }
  return s;
}

function requireDb(_req: Request, res: Response, next: () => void) {
  if (!process.env.DB_URL?.trim()) {
    res.status(503).json({ error: "Database not configured (set DB_URL)." });
    return;
  }
  next();
}

/** Resolve Auth0 sub → Prisma User.id. Returns null if user not found. */
async function resolveUserId(auth0Sub: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { auth0Sub },
    select: { id: true },
  });
  return user?.id ?? null;
}

// ── Google Workspace OAuth ───────────────────────────────────────────────────

function getGoogleWorkspaceOAuth2Client() {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_WORKSPACE_CLIENT_ID and GOOGLE_WORKSPACE_CLIENT_SECRET are required.",
    );
  }
  const redirectUri = "http://localhost:3001/api/integrations/google-workspace/callback";
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
  return oauth2Client;
}

function requireGoogleWorkspaceEnv(
  _req: Request,
  res: Response,
  next: () => void,
) {
  try {
    getGoogleWorkspaceOAuth2Client();
    next();
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Google Workspace OAuth is not configured.";
    res.status(503).json({ error: message });
  }
}

// ── Slack OAuth ──────────────────────────────────────────────────────────────

function getSlackOAuthConfig() {
  const clientId = process.env.SLACK_CLIENT_ID?.trim();
  const clientSecret = process.env.SLACK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are required.");
  }
  return { clientId, clientSecret };
}

function requireSlackEnv(_req: Request, res: Response, next: () => void) {
  try {
    getSlackOAuthConfig();
    next();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Slack OAuth is not configured.";
    res.status(503).json({ error: message });
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

export function createIntegrationsRouter() {
  const router = express.Router();

  // =========================================================================
  // Google Workspace
  // =========================================================================

  router.get(
    "/google-workspace/auth",
    requiresAuth(),
    requireDb,
    requireGoogleWorkspaceEnv,
    (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Missing user id" });
        return;
      }
      const oauth2 = getGoogleWorkspaceOAuth2Client();
      const state = signOAuthState(userSub, getStateSecret());
      const scopes = process.env.GOOGLE_WORKSPACE_SCOPES?.trim()
        ? process.env.GOOGLE_WORKSPACE_SCOPES.split(",")
        : [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/documents.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/drive.file",
          ];
      const url = oauth2.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: true,
        scope: scopes,
        state,
      });
      res.redirect(url);
    },
  );

  router.get(
    "/google-workspace/callback",
    async (req: Request, res: Response) => {
      const frontend = getFrontendUrl().replace(/\/$/, "");
      const error =
        typeof req.query.error === "string" ? req.query.error : undefined;
      if (error) {
        res.redirect(
          `${frontend}/connectors?error=${encodeURIComponent(error)}`,
        );
        return;
      }
      const code =
        typeof req.query.code === "string" ? req.query.code : undefined;
      const state =
        typeof req.query.state === "string" ? req.query.state : undefined;
      if (!code || !state) {
        res.redirect(`${frontend}/connectors?error=missing_code`);
        return;
      }
      const verified = verifyOAuthState(state, getStateSecret());
      if (!verified) {
        res.redirect(`${frontend}/connectors?error=invalid_state`);
        return;
      }
      if (
        req.oidc.isAuthenticated() &&
        req.oidc.user?.sub &&
        req.oidc.user.sub !== verified.sub
      ) {
        res.redirect(`${frontend}/connectors?error=session_mismatch`);
        return;
      }

      // Resolve Auth0 sub → actual User.id
      const userId = await resolveUserId(verified.sub);
      if (!userId) {
        res.redirect(`${frontend}/connectors?error=user_not_found`);
        return;
      }

      try {
        const oauth2 = getGoogleWorkspaceOAuth2Client();
        const { tokens } = await oauth2.getToken(code);
        oauth2.setCredentials(tokens);

        const oauth2Service = google.oauth2({ version: "v2", auth: oauth2 });
        const userInfo = await oauth2Service.userinfo.get();
        const userEmail = userInfo.data.email ?? null;

        const accessTokenEnc = tokens.access_token
          ? encryptToken(tokens.access_token)
          : null;
        const refreshTokenEnc = tokens.refresh_token
          ? encryptToken(tokens.refresh_token)
          : null;
        const tokenExpiry = tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null;
        const scopesGranted = tokens.scope ?? "";

        await prisma.integrationCredential.upsert({
          where: { userId_provider: { userId, provider: "google_workspace" } },
          update: {
            accessTokenEnc: accessTokenEnc ?? undefined,
            refreshTokenEnc: refreshTokenEnc ?? undefined,
            tokenExpiry,
            providerEmail: userEmail,
            providerScopes: scopesGranted,
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            userId,
            provider: "google_workspace",
            accessTokenEnc: accessTokenEnc ?? "",
            refreshTokenEnc: refreshTokenEnc ?? "",
            tokenExpiry,
            providerEmail: userEmail,
            providerScopes: scopesGranted,
            isActive: true,
          },
        });

        res.redirect(`${frontend}/connectors?google_workspace_connected=1`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "oauth_failed";
        res.redirect(
          `${frontend}/connectors?error=${encodeURIComponent(message)}`,
        );
      }
    },
  );

  router.get(
    "/google-workspace/status",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const cred = await prisma.integrationCredential.findUnique({
        where: { userId_provider: { userId, provider: "google_workspace" } },
      });
      res.json({
        connected: cred?.isActive ?? false,
        email: cred?.providerEmail ?? null,
        scopes: cred?.providerScopes ?? null,
        connectedAt: cred?.connectedAt ?? null,
      });
    },
  );

  router.post(
    "/google-workspace/disconnect",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await prisma.integrationCredential.updateMany({
        where: { userId, provider: "google_workspace" },
        data: { isActive: false, updatedAt: new Date() },
      });
      res.json({ ok: true });
    },
  );

  // =========================================================================
  // Slack
  // =========================================================================

  router.get(
    "/slack/auth",
    requiresAuth(),
    requireDb,
    requireSlackEnv,
    (req: Request, res: Response) => {
      const userSub = req.oidc.user?.sub;
      if (!userSub) {
        res.status(401).json({ error: "Missing user id" });
        return;
      }
      const { clientId } = getSlackOAuthConfig();
      const state = signOAuthState(userSub, getStateSecret());
      const redirectUri = `${getSlackRedirectBaseUrl()}/api/integrations/slack/callback`;
      const scopes = process.env.SLACK_SCOPES?.trim()
        ? process.env.SLACK_SCOPES
        : "channels:history,groups:history,im:history,mpim:history,channels:read,groups:read,im:read,mpim:read,users:read,team:read";

      const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      res.redirect(url);
    },
  );

  router.get("/slack/callback", async (req: Request, res: Response) => {
    const frontend = getFrontendUrl().replace(/\/$/, "");
    const error =
      typeof req.query.error === "string" ? req.query.error : undefined;
    if (error) {
      res.redirect(`${frontend}/connectors?error=${encodeURIComponent(error)}`);
      return;
    }
    const code =
      typeof req.query.code === "string" ? req.query.code : undefined;
    const state =
      typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state) {
      res.redirect(`${frontend}/connectors?error=missing_code`);
      return;
    }
    const verified = verifyOAuthState(state, getStateSecret());
    if (!verified) {
      res.redirect(`${frontend}/connectors?error=invalid_state`);
      return;
    }
    if (
      req.oidc.isAuthenticated() &&
      req.oidc.user?.sub &&
      req.oidc.user.sub !== verified.sub
    ) {
      res.redirect(`${frontend}/connectors?error=session_mismatch`);
      return;
    }

    // Resolve Auth0 sub → actual User.id
    const userId = await resolveUserId(verified.sub);
    if (!userId) {
      res.redirect(`${frontend}/connectors?error=user_not_found`);
      return;
    }

    try {
      const { clientId, clientSecret } = getSlackOAuthConfig();
      const redirectUri = `${getSlackRedirectBaseUrl()}/api/integrations/slack/callback`;

      const tokenResponse = await fetch(
        "https://slack.com/api/oauth.v2.access",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          }),
        },
      );

      const tokenData = (await tokenResponse.json()) as {
        ok: boolean;
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
        team?: { id: string; name: string };
        authed_user?: { id: string };
        error?: string;
      };

      if (!tokenData.ok) {
        throw new Error(tokenData.error ?? "Slack OAuth failed");
      }

      const accessTokenEnc = tokenData.access_token
        ? encryptToken(tokenData.access_token)
        : null;
      const refreshTokenEnc = tokenData.refresh_token
        ? encryptToken(tokenData.refresh_token)
        : null;
      const tokenExpiry = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      await prisma.integrationCredential.upsert({
        where: { userId_provider: { userId, provider: "slack" } },
        update: {
          accessTokenEnc: accessTokenEnc ?? undefined,
          refreshTokenEnc: refreshTokenEnc ?? undefined,
          tokenExpiry,
          providerTeamId: tokenData.team?.id ?? null,
          providerTeamName: tokenData.team?.name ?? null,
          providerScopes: tokenData.scope ?? null,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          userId,
          provider: "slack",
          accessTokenEnc: accessTokenEnc ?? "",
          refreshTokenEnc: refreshTokenEnc ?? "",
          tokenExpiry,
          providerTeamId: tokenData.team?.id ?? null,
          providerTeamName: tokenData.team?.name ?? null,
          providerScopes: tokenData.scope ?? null,
          isActive: true,
        },
      });

      res.redirect(`${frontend}/connectors?slack_connected=1`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "oauth_failed";
      res.redirect(
        `${frontend}/connectors?error=${encodeURIComponent(message)}`,
      );
    }
  });

  router.get(
    "/slack/status",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const cred = await prisma.integrationCredential.findUnique({
        where: { userId_provider: { userId, provider: "slack" } },
      });
      res.json({
        connected: cred?.isActive ?? false,
        teamId: cred?.providerTeamId ?? null,
        teamName: cred?.providerTeamName ?? null,
        scopes: cred?.providerScopes ?? null,
        connectedAt: cred?.connectedAt ?? null,
      });
    },
  );

  router.post(
    "/slack/disconnect",
    requiresAuth(),
    requireDb,
    async (req: Request, res: Response) => {
      const auth0Sub = req.oidc.user?.sub;
      if (!auth0Sub) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const userId = await resolveUserId(auth0Sub);
      if (!userId) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await prisma.integrationCredential.updateMany({
        where: { userId, provider: "slack" },
        data: { isActive: false, updatedAt: new Date() },
      });
      res.json({ ok: true });
    },
  );

  return router;
}
