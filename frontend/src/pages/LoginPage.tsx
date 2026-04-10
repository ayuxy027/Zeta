import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ShieldCheck, ArrowRight } from 'lucide-react';

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
    <div className="relative min-h-screen pt-20 bg-vintage-white flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-vintage-white to-purple-50/40 pointer-events-none" />
      
      {/* Animated grid pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px),
                              linear-gradient(to bottom, #000 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
          }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-100/20 border border-gray-100 overflow-hidden relative">
          {/* Top card decorative bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

          <div className="p-8 sm:p-12 text-center">
            
            <div className="w-16 h-16 bg-vintage-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 transition-transform hover:rotate-6">
              <ShieldCheck className="w-8 h-8 text-vintage-white -rotate-3" />
            </div>

            <h1 className="text-3xl font-bold font-display text-vintage-black mb-2 tracking-tight">Access Zeta</h1>
            <p className="text-vintage-gray-600 mb-8 text-sm leading-relaxed">
              Sign in securely to manage your AI agents, transcriptions, and connected workflows.
            </p>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium text-vintage-gray-600 animate-pulse">Authenticating securely...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleLogin}
                  className="group relative flex items-center justify-center w-full bg-white border-2 border-gray-100 text-vintage-black px-6 py-3.5 rounded-xl font-semibold hover:border-indigo-600 hover:text-indigo-600 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                  <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 absolute right-6" />
                </button>
                
                <button
                  onClick={handleLogin}
                  className="group relative flex items-center justify-center w-full bg-vintage-black border-2 border-vintage-black text-vintage-white px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition-all duration-300 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Continue with GitHub
                  <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 absolute right-6" />
                </button>
              </div>
            )}

            {isAuthenticated && (
              <div className="mt-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <p className="text-sm text-indigo-800 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
                  Signed in securely as {user?.email ?? 'User'}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50/50 border-t border-gray-100 p-6 text-center">
            <p className="text-xs text-vintage-gray-500">
              By accessing Zeta, you agree to our <a href="#" className="font-medium text-indigo-600 hover:underline">Terms of Service</a> and <a href="#" className="font-medium text-indigo-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
