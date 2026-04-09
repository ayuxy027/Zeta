import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AUTH_SCOPE, isAuthConfigured } from '../auth/config';

type LoginLocationState = {
  from?: string;
};

const LoginPageWithAuth: React.FC = () => {
  const { loginWithRedirect, isLoading, isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const from = locationState?.from ?? '/dashboard';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, navigate]);

  const handleLogin = async () => {
    await loginWithRedirect({
      authorizationParams: {
        scope: AUTH_SCOPE,
      },
      appState: {
        returnTo: from,
      },
    });
  };

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl card p-10 text-center">
        <h1 className="text-3xl font-bold font-display text-vintage-black mb-3">Sign In</h1>
        <p className="text-vintage-gray-600 mb-8">
          Continue with your Auth0-connected Google account.
        </p>

        {isLoading ? (
          <p className="text-vintage-gray-600">Loading authentication...</p>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-indigo-600 text-white px-6 py-3 rounded-full font-medium hover:bg-indigo-700 transition"
          >
            Continue With Google
          </button>
        )}

        {isAuthenticated && (
          <p className="text-sm text-vintage-gray-600 mt-6">
            Signed in as {user?.email ?? 'user'}.
          </p>
        )}
      </div>
    </div>
  );
};

const LoginPage: React.FC = () => {
  if (!isAuthConfigured()) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl card p-10">
          <h1 className="text-3xl font-bold font-display text-vintage-black mb-3">Auth Not Configured</h1>
          <p className="text-vintage-gray-700 mb-4">
            Add these values to <code>frontend/.env</code>:
          </p>
          <pre className="text-sm bg-vintage-gray-100 p-4 rounded-lg overflow-auto">
{`VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience-optional`}
          </pre>
          <p className="text-sm text-vintage-gray-600 mt-4">
            Current redirect URI should be: <code>{window.location.origin}/login</code>
          </p>
        </div>
      </div>
    );
  }

  return <LoginPageWithAuth />;
};

export default LoginPage;
