import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import LandingPage from "./pages/LandingPage";
import ChangelogPage from "./pages/ChangelogPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import ConnectorsPage from "./pages/ConnectorsPage";
import RecallBotPage from "./pages/RecallBotPage";
import LoginPage from "./pages/LoginPage";
import RequireAuth from "./auth/RequireAuth";

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-vintage-white pt-20">
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/connectors"
          element={
            <RequireAuth>
              <ConnectorsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/recall"
          element={
            <RequireAuth>
              <RecallBotPage />
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
