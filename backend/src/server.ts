import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import oidc from 'express-openid-connect';
import slackRouter from './routers/slack.router.js';
import { initDb } from './db/pool.js';
import { createDriveIngestRouter } from './routes/driveIngest.js';
import { startSlackWorker } from './workers/slack.worker.js';

const { auth, requiresAuth } = oidc;

const port = Number(process.env.PORT ?? 3000);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const app = express();

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());

// Slack webhook endpoint (no auth required - must be before auth middleware)
app.use('/slack', slackRouter);

// Auth middleware (optional - only enabled if AUTH0 env vars are present)
const auth0Issuer = process.env.AUTH0_ISSUER_BASE_URL?.trim();
const auth0BaseURL = process.env.AUTH0_BASE_URL?.trim();
const auth0ClientID = process.env.AUTH0_CLIENT_ID?.trim();
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET?.trim();
const auth0Secret = process.env.AUTH0_SECRET?.trim();

if (auth0Issuer && auth0BaseURL && auth0ClientID && auth0ClientSecret && auth0Secret) {
  app.use(
    auth({
      authRequired: false,
      issuerBaseURL: auth0Issuer,
      baseURL: auth0BaseURL,
      clientID: auth0ClientID,
      clientSecret: auth0ClientSecret,
      secret: auth0Secret,
      idTokenSigningAlg: process.env.AUTH0_ID_TOKEN_SIGNING_ALG?.trim() || 'RS256',
      authorizationParams: {
        response_type: 'code',
        scope: 'openid profile email offline_access',
      },
      routes: {
        login: '/auth/login',
        logout: '/auth/logout',
        callback: '/auth/callback',
      },
    }),
  );
  console.log('Auth0 middleware enabled');
} else {
  console.warn('Auth0 middleware disabled - missing environment variables');
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'zeta-backend' });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ authenticated: false, user: null });
  }

  const user = req.oidc.user ?? {};
  return res.json({
    authenticated: true,
    user: {
      sub: user.sub ?? null,
      name: user.name ?? null,
      email: user.email ?? null,
      picture: user.picture ?? null,
    },
  });
});

app.get('/api/auth/access-token', requiresAuth(), (req: Request, res: Response) => {
  const accessToken = req.oidc.accessToken?.access_token ?? null;
  res.json({ accessToken });
});

app.use('/api', createDriveIngestRouter());

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`Zeta backend listening on http://localhost:${port}`);
    startSlackWorker();
  });
}

void start();
