import { authConfig } from './config';

export interface AuthUser {
  sub: string | null;
  name: string | null;
  email: string | null;
  picture: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

const withBackend = (path: string) => `${authConfig.backendUrl}${path}`;

export const fetchAuthState = async (): Promise<AuthState> => {
  const response = await fetch(withBackend('/api/auth/me'), {
    credentials: 'include',
  });

  if (!response.ok) {
    return { isAuthenticated: false, user: null };
  }

  const payload = (await response.json()) as {
    authenticated?: boolean;
    user?: AuthUser | null;
  };

  return {
    isAuthenticated: Boolean(payload.authenticated),
    user: payload.user ?? null,
  };
};

export const startBackendLogin = (returnToPath: string) => {
  const returnTo = `${window.location.origin}${returnToPath}`;
  window.location.href = withBackend(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
};

export const startBackendLogout = (returnToPath = '/') => {
  const returnTo = `${window.location.origin}${returnToPath}`;
  window.location.href = withBackend(`/auth/logout?returnTo=${encodeURIComponent(returnTo)}`);
};
