import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import oidc from "express-openid-connect";
import slackRouter from "./routers/slack.router.js";
import { initDb } from "./db/pool.js";
import { initNeo4j } from "./services/neo4j.service.js";
import { ensureChromaCollection } from "./services/chromadb.service.js";
import { createDriveIngestRouter } from "./routes/driveIngest.js";
import { createGmailRouter } from "./routes/gmail.js";
import { createIntegrationsRouter } from "./routers/integrations.router.js";
import { prisma } from "./lib/prisma.js";
import { createQueryRouter } from "./routes/query.js";
import { createRecallRouter } from "./routers/recall.router.js";
import recallWebhooksRouter from "./routers/recallWebhooks.router.js";
import { startSlackWorker } from "./workers/slack.worker.js";

const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const { auth, requiresAuth } = oidc;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const app = express();

const getSafeFrontendReturnTo = (
  value: unknown,
  fallbackPath = "/dashboard",
): string => {
  const fallback = `${frontendUrl}${fallbackPath}`;
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const parsed = new URL(value);
    const frontend = new URL(frontendUrl);
    if (parsed.origin !== frontend.origin) {
      return fallback;
    }

    return `${frontend.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    if (value.startsWith("/")) {
      return `${frontendUrl}${value}`;
    }
    return fallback;
  }
};

type OidcProfile = {
  sub: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
};

const asStringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const decodeJwtPayload = (
  token: unknown,
): Record<string, unknown> | undefined => {
  if (typeof token !== "string") {
    return undefined;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return undefined;
  }

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const extractOidcProfile = (
  ...sources: Array<Record<string, unknown> | undefined>
): OidcProfile => {
  const pick = (field: "sub" | "email" | "name" | "picture"): string | null => {
    for (const source of sources) {
      const candidate = asStringOrNull(source?.[field]);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  };

  return {
    sub: pick("sub"),
    email: pick("email"),
    name: pick("name"),
    picture: pick("picture"),
  };
};

const syncOidcUser = async (profile: OidcProfile) => {
  if (!profile.sub) {
    return null;
  }

  return prisma.user.upsert({
    where: { auth0Sub: profile.sub },
    update: {
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
    create: {
      auth0Sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    },
  });
};

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "300mb",
    verify: (req, _res, buf) => {
      (req as unknown as Record<string, unknown>).rawBody = buf.toString("utf8");
    },
  }),
);

// Slack webhook endpoint (no auth required - must be before auth middleware)
app.use("/slack", slackRouter);
app.use("/webhooks/recall", recallWebhooksRouter);

app.use(
  auth({
    authRequired: false,
    issuerBaseURL: getRequiredEnv("AUTH0_ISSUER_BASE_URL"),
    baseURL: getRequiredEnv("AUTH0_BASE_URL"),
    clientID: getRequiredEnv("AUTH0_CLIENT_ID"),
    clientSecret: getRequiredEnv("AUTH0_CLIENT_SECRET"),
    secret: getRequiredEnv("AUTH0_SECRET"),
    // Must match Auth0 Application → Advanced → OAuth → JWT Signature Algorithm (RS256 vs HS256).
    idTokenSigningAlg:
      process.env.AUTH0_ID_TOKEN_SIGNING_ALG?.trim() || "RS256",
    authorizationParams: {
      response_type: "code",
      scope: "openid profile email offline_access",
    },
    getLoginState: (req, options) => {
      const queryReturnTo =
        typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;

      return {
        returnTo: getSafeFrontendReturnTo(
          queryReturnTo ?? options.returnTo,
          "/dashboard",
        ),
      };
    },
    idpLogout: true,
    logoutParams: {
      returnTo: frontendUrl,
    },
    afterCallback: async (_req, _res, session) => {
      const tokenClaims = decodeJwtPayload(session.id_token);
      const profile = extractOidcProfile(
        session.user as Record<string, unknown> | undefined,
        session.idTokenClaims as Record<string, unknown> | undefined,
        tokenClaims,
      );

      const dbUser = await syncOidcUser(profile);
      if (!dbUser) {
        console.warn(
          "OAuth callback completed without subject claim; user sync skipped",
        );
      }

      return session;
    },
    routes: {
      login: "/auth/login",
      logout: "/auth/logout",
      callback: "/auth/callback",
      postLogoutRedirect: frontendUrl,
    },
  }),
);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "zeta-backend" });
});

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "zeta-backend" });
});

app.get("/api/auth/me", async (req: Request, res: Response) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ authenticated: false, user: null });
  }

  const profile = extractOidcProfile(
    req.oidc.user as Record<string, unknown> | undefined,
    req.oidc.idTokenClaims as Record<string, unknown> | undefined,
  );

  const dbUser = await syncOidcUser(profile);

  if (!dbUser) {
    return res.json({
      authenticated: true,
      user: {
        sub: profile.sub,
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      },
    });
  }

  return res.json({
    authenticated: true,
    user: {
      sub: dbUser.auth0Sub,
      name: dbUser.name,
      email: dbUser.email,
      picture: dbUser.picture,
    },
  });
});

app.get(
  "/api/auth/access-token",
  requiresAuth(),
  (req: Request, res: Response) => {
    const accessToken = req.oidc.accessToken?.access_token ?? null;
    res.json({ accessToken });
  },
);

app.use("/api", createDriveIngestRouter());
app.use("/api", createGmailRouter());
app.use("/api/integrations", createIntegrationsRouter());
app.use("/api", createQueryRouter());
app.use("/api/recall", createRecallRouter());

async function start() {
  await initDb();
  await initNeo4j();
  try {
    await ensureChromaCollection();
    console.log("[chroma] Collection is ready");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[chroma] Collection warmup failed; retrying lazily on query:", message);
  }
  app.listen(port, () => {
    console.log(`Zeta backend listening on http://localhost:${port}`);
    startSlackWorker();
  });
}

void start();
