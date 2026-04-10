import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { auth, requiresAuth } from 'express-openid-connect';
import slackRouter from './routers/slack.router.js';

const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

const app = express();

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());

// Slack webhook endpoint (no auth required)
app.use('/slack', slackRouter);

app.use(
  auth({
    authRequired: false,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL ?? '',
    baseURL: process.env.AUTH0_BASE_URL ?? `http://localhost:${port}`,
    clientID: process.env.AUTH0_CLIENT_ID ?? '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET ?? '',
    secret: process.env.AUTH0_SECRET ?? '',
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

app.listen(port, () => {
  console.log(`Zeta backend listening on http://localhost:${port}`);
});
