import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

type LoginLocationState = {
  from?: string;
};

const LoginPage: React.FC = () => {
  const { login, isLoading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const from = locationState?.from ?? '/dashboard';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, navigate]);

  const handleLogin = () => {
    login(from);
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

export default LoginPage;
