import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthConfigured } from './config';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuthWithProvider: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-vintage-gray-700">
        Checking your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  if (!isAuthConfigured()) {
    return <>{children}</>;
  }

  return <RequireAuthWithProvider>{children}</RequireAuthWithProvider>;
};

export default RequireAuth;
