import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/guards';
import Spinner from '@/components/atoms/Spinner';
import { ForbiddenPage, NotFoundPage, RouteErrorPage } from '@/pages/ErrorPages';

// Route-level code splitting keeps the initial bundle small.
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const EditProfilePage = lazy(() => import('@/features/profile/pages/EditProfilePage'));
const PeoplePage = lazy(() => import('@/features/connections/pages/PeoplePage'));
const RequestsPage = lazy(() => import('@/features/connections/pages/RequestsPage'));
const ConnectionsPage = lazy(() => import('@/features/connections/pages/ConnectionsPage'));
const CommunitiesPage = lazy(() => import('@/features/communities/pages/CommunitiesPage'));
const CreateCommunityPage = lazy(() => import('@/features/communities/pages/CreateCommunityPage'));
const CommunityDetailPage = lazy(() => import('@/features/communities/pages/CommunityDetailPage'));
const MembersPage = lazy(() => import('@/features/communities/pages/MembersPage'));
const CommunitySettingsPage = lazy(() => import('@/features/communities/pages/CommunitySettingsPage'));
const JoinRequestsPage = lazy(() => import('@/features/communities/pages/JoinRequestsPage'));
const InvitationsPage = lazy(() => import('@/features/communities/pages/InvitationsPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));
const MessagesPage = lazy(() => import('@/features/chat/pages/MessagesPage'));
const EventsPage = lazy(() => import('@/features/events/pages/EventsPage'));
const MatchesPage = lazy(() => import('@/features/matching/pages/MatchesPage'));
const SearchPage = lazy(() => import('@/features/search/pages/SearchPage'));
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));

function RouteFallback() {
  return (
    <div className="grid min-h-60 place-items-center">
      <Spinner size="lg" className="text-brand-600" label="Loading page" />
    </div>
  );
}

function withSuspense(element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: withSuspense(<LoginPage />) },
          { path: '/register', element: withSuspense(<RegisterPage />) },
          { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
          { path: '/reset-password', element: withSuspense(<ResetPasswordPage />) },
        ],
      },
    ],
  },
  {
    // Reachable signed in or out: the link arrives by email.
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [{ path: '/verify-email', element: withSuspense(<VerifyEmailPage />) }],
  },
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/communities', element: withSuspense(<CommunitiesPage />) },
      { path: '/communities/:slug', element: withSuspense(<CommunityDetailPage />) },
      { path: '/search', element: withSuspense(<SearchPage />) },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withSuspense(<DashboardPage />) },
          { path: '/people', element: withSuspense(<PeoplePage />) },
          { path: '/requests', element: withSuspense(<RequestsPage />) },
          { path: '/connections', element: withSuspense(<ConnectionsPage />) },
          { path: '/u/:username', element: withSuspense(<ProfilePage />) },
          { path: '/settings/profile', element: withSuspense(<EditProfilePage />) },
          { path: '/communities/create', element: withSuspense(<CreateCommunityPage />) },
          { path: '/communities/invitations', element: withSuspense(<InvitationsPage />) },
          { path: '/communities/:slug/members', element: withSuspense(<MembersPage />) },
          { path: '/communities/:slug/settings', element: withSuspense(<CommunitySettingsPage />) },
          { path: '/communities/:slug/requests', element: withSuspense(<JoinRequestsPage />) },
          { path: '/notifications', element: withSuspense(<NotificationsPage />) },
          { path: '/messages', element: withSuspense(<MessagesPage />) },
          { path: '/events', element: withSuspense(<EventsPage />) },
          { path: '/matches', element: withSuspense(<MatchesPage />) },
          { path: '/admin', element: withSuspense(<AdminDashboardPage />) },
        ],
      },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default router;
