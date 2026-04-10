import 'dotenv/config';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import oidc from 'express-openid-connect';

const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const { auth, requiresAuth } = oidc;

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const app = express();

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);

app.use(express.json());

app.use(
  auth({
    authRequired: false,
    issuerBaseURL: getRequiredEnv('AUTH0_ISSUER_BASE_URL'),
    baseURL: getRequiredEnv('AUTH0_BASE_URL'),
    clientID: getRequiredEnv('AUTH0_CLIENT_ID'),
    clientSecret: getRequiredEnv('AUTH0_CLIENT_SECRET'),
    secret: getRequiredEnv('AUTH0_SECRET'),
    // Must match Auth0 Application → Advanced → OAuth → JWT Signature Algorithm (RS256 vs HS256).
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
