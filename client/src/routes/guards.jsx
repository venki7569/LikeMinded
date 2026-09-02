import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Spinner from '@/components/atoms/Spinner';
import { selectAuth } from '@/features/auth/authSlice';

function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner size="lg" className="text-brand-600" label="Restoring your session" />
    </div>
  );
}

/** Blocks anonymous visitors, remembering where they were headed. */
export function ProtectedRoute({ roles }) {
  const { isAuthenticated, isInitializing, user } = useSelector(selectAuth);
  const location = useLocation();

  // Waiting avoids briefly redirecting a signed-in user on a hard reload.
  if (isInitializing) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}

/** Keeps signed-in users out of login/register screens. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useSelector(selectAuth);

  if (isInitializing) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
