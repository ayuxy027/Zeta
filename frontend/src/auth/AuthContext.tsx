import React from 'react';
import { fetchAuthState, startBackendLogin, startBackendLogout, type AuthState } from './session';

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  refresh: () => Promise<void>;
  login: (returnToPath?: string) => void;
  logout: (returnToPath?: string) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<AuthState>({ isAuthenticated: false, user: null });
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const nextState = await fetchAuthState();
      setState(nextState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: AuthContextValue = {
    ...state,
    isLoading,
    refresh,
    login: (returnToPath = '/dashboard') => startBackendLogin(returnToPath),
    logout: (returnToPath = '/') => startBackendLogout(returnToPath),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
