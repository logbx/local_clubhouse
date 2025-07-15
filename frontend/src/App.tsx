import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AuthLayout from './components/AuthLayout';
import PublicLayout from './components/PublicLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import EventDashboard from './pages/EventDashboard';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import SettingsPage from './pages/SettingsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import PublicProfilePage from './pages/PublicProfilePage';
import PublicEventPage from './pages/PublicEventPage';
import FriendsDashboard from './pages/FriendsDashboard';
import MessagesPage from './pages/MessagesPage';
import MessageThreadPage from './pages/MessageThreadPage';
import TournamentPage from './pages/TournamentPage';
import TournamentManagePage from './pages/TournamentManagePage';
import { MatchResultsPage } from './pages/MatchResultsPage';
import ClubProfilePage from './pages/ClubProfilePage';
import CreateClubPage from './pages/CreateClubPage';
import ClubsExplorePage from './pages/ClubsExplorePage';
import ClubAdminDashboard from './pages/ClubAdminDashboard';
import SponsorProfilePage from './pages/SponsorProfilePage';
import CreateSponsorPage from './pages/CreateSponsorPage';
import SponsorsExplorePage from './pages/SponsorsExplorePage';
import SponsorDashboard from './pages/SponsorDashboard';
import SocialHub from './pages/SocialHub';
import NotificationToast from './components/NotificationToast';
import NotificationPopupManager from './components/NotificationPopupManager';
// import SwissTournamentAdmin from './pages/SwissTournamentAdmin';
import SwissTournamentManagePage from './pages/SwissTournamentManagePage';
import { SwissMatchResultsPage } from './pages/SwissMatchResultsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import SingleEliminationTournamentPage from './pages/tournaments/SingleEliminationTournamentPage';
import SwissTournamentPage from './pages/tournaments/SwissTournamentPage';

// Redirect component for old URL patterns
const TournamentRedirect: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (tournamentId) {
      // Redirect from underscore URLs to hyphen URLs
      const pathname = location.pathname;
      if (pathname.includes('single_elimination')) {
        navigate(pathname.replace('single_elimination', 'single-elimination'), { replace: true });
      } else if (pathname.includes('tournament/swiss')) {
        // Handle swiss redirects if needed
        navigate(pathname, { replace: true });
      } else {
        // Fallback to generic tournament page
        navigate(`/tournament/${tournamentId}`, { replace: true });
      }
    }
  }, [tournamentId, location.pathname, navigate]);

  return <div>Redirecting...</div>;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Theme-aware ToastContainer component
const ThemedToastContainer: React.FC = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
      className="dark:bg-gray-800"
    />
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
        <AuthProvider>
          <NotificationToast />
          <NotificationPopupManager />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            
            {/* Public Profile and Event Routes with Layout */}
            <Route path="/user/:userId" element={<PublicLayout><PublicProfilePage /></PublicLayout>} />
            <Route path="/event/:eventId" element={<PublicLayout><PublicEventPage /></PublicLayout>} />
            <Route path="/tournament/:tournamentId" element={<PublicLayout><TournamentPage /></PublicLayout>} />
            <Route path="/tournament/single-elimination/:tournamentId" element={<PublicLayout><SingleEliminationTournamentPage /></PublicLayout>} />
            <Route path="/tournament/swiss/:tournamentId" element={<PublicLayout><SwissTournamentPage /></PublicLayout>} />
            {/* Redirect routes for old URL patterns with underscores */}
            <Route path="/tournament/single_elimination/:tournamentId" element={<TournamentRedirect />} />
            <Route path="/clubs/:clubUsername" element={<PublicLayout><ClubProfilePage /></PublicLayout>} />
            <Route path="/sponsors/:sponsorUsername" element={<PublicLayout><SponsorProfilePage /></PublicLayout>} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthLayout><Outlet /></AuthLayout>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/events" element={<EventDashboard />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<ProfileEditPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/friends" element={<FriendsDashboard />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:userId" element={<MessageThreadPage />} />
                <Route path="/tournament/manage" element={<TournamentManagePage />} />
                <Route path="/tournament/single-elimination" element={<SingleEliminationTournamentPage />} />
                <Route path="/tournament/single-elimination/:tournamentId" element={<SingleEliminationTournamentPage />} />
                <Route path="/tournament/single-elimination/:tournamentId/manage" element={<TournamentManagePage />} />
                <Route path="/tournament/single-elimination/:tournamentId/results" element={<MatchResultsPage />} />
                <Route path="/tournament/swiss" element={<SwissTournamentPage />} />
                <Route path="/tournament/swiss/:tournamentId" element={<SwissTournamentPage />} />
                <Route path="/tournament/swiss/:tournamentId/manage" element={<SwissTournamentManagePage />} />
                <Route path="/tournament/swiss/:tournamentId/results" element={<SwissMatchResultsPage />} />
                <Route path="/clubs" element={<ClubsExplorePage />} />
                <Route path="/create-club" element={<CreateClubPage />} />
                <Route path="/clubs/:clubUsername/admin" element={<ClubAdminDashboard />} />
                <Route path="/sponsors" element={<SponsorsExplorePage />} />
                <Route path="/create-sponsor" element={<CreateSponsorPage />} />
                <Route path="/sponsors/:sponsorUsername/dashboard" element={<SponsorDashboard />} />
              </Route>
              {/* Full-screen Social Hub */}
              <Route path="/social-hub" element={<AuthLayout fullScreen><SocialHub /></AuthLayout>} />
            </Route>

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AuthLayout><Outlet /></AuthLayout>}>
                <Route path="/admin" element={<div>Admin Dashboard</div>} />
              </Route>
            </Route>

            {/* Error Routes */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
            <ThemedToastContainer />
        </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
