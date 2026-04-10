import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import AboutPage from "./pages/AboutPage";
import ChangelogPage from "./pages/ChangelogPage";
import BlogPage from "./pages/BlogPage";
import DashboardPage from "./pages/DashboardPage";
import DriveIngestPage from "./pages/DriveIngestPage";
import MailPage from "./pages/MailPage";
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
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/drive"
          element={
            <RequireAuth>
              <DriveIngestPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/mail"
          element={
            <RequireAuth>
              <MailPage />
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
