import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import './index.css'
import App from './App.tsx'
import { AUTH_SCOPE, authConfig, isAuthConfigured } from './auth/config'

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

const authEnabled = isAuthConfigured()

const withAuth = authEnabled ? (
  <Auth0Provider
    domain={authConfig.domain}
    clientId={authConfig.clientId}
    authorizationParams={{
      redirect_uri: `${window.location.origin}/login`,
      scope: AUTH_SCOPE,
      ...(authConfig.audience ? { audience: authConfig.audience } : {}),
    }}
    cacheLocation="localstorage"
    useRefreshTokens
  >
    {app}
  </Auth0Provider>
) : (
  app
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {withAuth}
  </StrictMode>,
)
