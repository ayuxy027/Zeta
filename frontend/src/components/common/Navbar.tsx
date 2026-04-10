import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Mic, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "../../auth/useAuth";
import { useSyncContext } from "../../context/SyncContext";

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { isAnySyncing } = useSyncContext();
  const isChatRoute = location.pathname === "/dashboard/chat";

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/dashboard/chat", label: "Chat" },
    { path: "/dashboard/recall", label: "Recall" },
    { path: "/connectors", label: "Connectors" },
  ];

  const toggleMenu = () => setIsMenuOpen((value) => !value);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    setIsChatSidebarOpen(false);
  }, [location.pathname]);

  const getUserInitial = () => {
    const value = user?.name || user?.email || "U";
    return value.charAt(0).toUpperCase();
  };

  if (isChatRoute) {
    return (
      <>
        <div className="fixed left-4 sm:left-5 top-1/2 -translate-y-1/2 z-[70]">
          <button
            type="button"
            onClick={() => setIsChatSidebarOpen((value) => !value)}
            className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur border border-gray-200 shadow-[0_18px_40px_-25px_rgba(15,23,42,0.6)] text-vintage-black inline-flex items-center justify-center hover:-translate-y-0.5 transition"
            aria-label={isChatSidebarOpen ? "Close navigation" : "Open navigation"}
          >
            {isChatSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        <aside
          className={`fixed left-4 sm:left-5 top-1/2 -translate-y-1/2 z-[65] w-[284px] sm:w-[320px] h-[360px] sm:h-[390px] rounded-[38px] border border-gray-200 bg-white/96 backdrop-blur-xl shadow-[0_40px_90px_-45px_rgba(15,23,42,0.75)] p-4 flex flex-col transition-all duration-300 ${
            isChatSidebarOpen
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "-translate-x-[115%] opacity-0 pointer-events-none"
          }`}
          aria-hidden={!isChatSidebarOpen}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-2xl px-2 py-1 hover:bg-gray-50 transition"
            >
              <span className="w-8 h-8 rounded-xl bg-vintage-black text-white inline-flex items-center justify-center">
                <Mic className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-vintage-black">Zeta</span>
            </button>
            <button
              type="button"
              onClick={() => setIsChatSidebarOpen(false)}
              className="w-8 h-8 rounded-xl border border-gray-200 text-vintage-gray-700 inline-flex items-center justify-center hover:bg-gray-50 transition"
              aria-label="Collapse navigation"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>

          <nav className="mt-4 grid gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const showSyncDot = item.path === "/connectors" && isAnySyncing;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-sm flex items-center justify-between transition ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-50 text-vintage-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {showSyncDot && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
            {isLoading ? (
              <p className="text-xs text-vintage-gray-500">Loading...</p>
            ) : isAuthenticated ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-vintage-black truncate">
                    {user?.name ?? user?.email ?? "Signed in"}
                  </p>
                  <p className="text-[11px] text-vintage-gray-500">Workspace active</p>
                </div>
                <button
                  onClick={() => logout("/")}
                  className="text-xs px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                className="w-full rounded-full bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
                onClick={() => login("/dashboard")}
              >
                Sign in
              </button>
            )}
          </div>
        </aside>
      </>
    );
  }

  return (
    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-between px-6 py-3 md:py-4 shadow-lg rounded-full bg-white/95 backdrop-blur-sm border border-gray-100/50 w-[calc(100%-2rem)] max-w-5xl">
      <button
        onClick={() => navigate("/")}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
      >
        <div className="w-8 h-8 bg-vintage-black rounded-xl flex items-center justify-center">
          <Mic className="w-5 h-5 text-vintage-white" />
        </div>
        <span className="text-xl font-display font-bold text-vintage-black">
          Zeta
        </span>
      </button>

      <nav
        id="menu"
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:overflow-hidden items-center justify-center max-md:h-full max-md:w-0 transition-[width] bg-white/50 backdrop-blur flex-col md:flex-row flex gap-8 text-gray-900 text-sm font-normal ${
          isMenuOpen ? "max-md:w-full" : "max-md:w-0"
        }`}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showSyncDot = item.path === "/connectors" && isAnySyncing;
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                closeMenu();
              }}
              className={`flex items-center gap-1.5 hover:text-indigo-600 transition-colors ${isActive ? "text-indigo-600 font-medium" : ""}`}
            >
              {item.label}
              {showSyncDot && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                </span>
              )}
            </button>
          );
        })}

        {isLoading ? (
          <span className="md:hidden text-sm text-vintage-gray-500">
            Loading...
          </span>
        ) : isAuthenticated ? (
          <div className="md:hidden flex flex-col items-center gap-3 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {getUserInitial()}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.name ?? user?.email ?? "Signed in"}
              </span>
            </div>
            <button
              className="w-full max-w-[200px] border border-red-100 bg-red-50 text-red-600 px-5 py-2 rounded-full text-sm font-medium hover:bg-red-100 transition flex justify-center items-center gap-2"
              onClick={() => {
                closeMenu();
                logout("/");
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        ) : (
          <button
            className="md:hidden bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition"
            onClick={() => {
              closeMenu();
              login("/dashboard");
            }}
          >
            Sign in
          </button>
        )}

        <button
          onClick={closeMenu}
          className="md:hidden text-gray-600 absolute top-4 right-4"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </nav>

      <div className="flex items-center space-x-4">
        {isLoading ? (
          <span className="hidden md:flex text-sm text-vintage-gray-500">
            Loading...
          </span>
        ) : isAuthenticated ? (
          <div className="hidden md:relative md:flex items-center">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {getUserInitial()}
              </div>
              <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {user?.name ?? user?.email ?? "Signed in"}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg shadow-black/5 border border-gray-100 py-1 overflow-hidden z-[60]">
                {user && (
                  <div className="px-4 py-3 border-b border-gray-50 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.name || "User"}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout("/");
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="hidden md:flex bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition"
            onClick={() => login("/dashboard")}
          >
            Sign in
          </button>
        )}

        <button
          id="openMenu"
          className="md:hidden text-gray-600"
          onClick={toggleMenu}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
