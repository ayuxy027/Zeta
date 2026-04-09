export const authConfig = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN?.trim() ?? '',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID?.trim() ?? '',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE?.trim() ?? '',
};

export const AUTH_SCOPE = 'openid profile email';

export const isAuthConfigured = () => {
  return Boolean(authConfig.domain && authConfig.clientId);
};
