import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  const navItems = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/dashboard/drive", label: "Drive" },
    { path: "/dashboard/mail", label: "Mail" },
    { path: "/pricing", label: "Pricing" },
    { path: "/about", label: "About" },
    { path: "/changelog", label: "Changelog" },
    { path: "/blog", label: "Blog" },
  ];

  const toggleMenu = () => setIsMenuOpen((value) => !value);
  const closeMenu = () => setIsMenuOpen(false);

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
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                closeMenu();
              }}
              className={`hover:text-indigo-600 transition-colors ${isActive ? "text-indigo-600 font-medium" : ""}`}
            >
              {item.label}
            </button>
          );
        })}

        {isLoading ? (
          <span className="md:hidden text-sm text-vintage-gray-500">
            Loading...
          </span>
        ) : isAuthenticated ? (
          <div className="md:hidden flex flex-col items-center gap-3">
            <span className="text-sm text-vintage-gray-700">
              {user?.name ?? user?.email ?? "Signed in"}
            </span>
            <button
              className="bg-vintage-black text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
              onClick={() => {
                closeMenu();
                logout("/");
              }}
            >
              Logout
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
          <div className="hidden md:flex items-center space-x-3">
            <span className="text-sm text-vintage-gray-700">
              {user?.name ?? user?.email ?? "Signed in"}
            </span>
            <button
              className="bg-vintage-black text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition"
              onClick={() => logout("/")}
            >
              Logout
            </button>
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
