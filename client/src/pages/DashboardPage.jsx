import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineCheckBadge,
  HiOutlineEnvelope,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import CompletenessBar from '@/components/molecules/CompletenessBar';
import PostComposer from '@/features/posts/components/PostComposer';
import FeedList from '@/features/posts/components/FeedList';
import authApi from '@/features/auth/authApi';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { fetchCompleteness, selectCompleteness } from '@/features/profile/profileSlice';
import { fetchHomeFeed, selectFeed } from '@/features/posts/postSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';

export function DashboardPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const completeness = useSelector(selectCompleteness);
  const feed = useSelector(selectFeed);
  const [isResending, setIsResending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    dispatch(fetchCompleteness());
    dispatch(fetchHomeFeed({ limit: 15 }));
  }, [dispatch]);

  const handleLoadMore = async () => {
    if (!feed.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await dispatch(fetchHomeFeed({ cursor: feed.nextCursor, limit: 15 })).unwrap();
    } finally {
      setLoadingMore(false);
    }
  };

  const resendVerification = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification(user.email);
      dispatch(pushToast({ message: 'Verification email sent.', tone: 'success' }));
    } catch (error) {
      dispatch(pushToast({ message: toApiError(error).message, tone: 'error' }));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catch up on updates from your connections and communities.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={user?.username ? `/u/${user.username}` : '/settings/profile'}>
            <Button variant="secondary" size="sm">My Profile</Button>
          </Link>
          <Link to="/settings/profile">
            <Button size="sm" leftIcon={<HiOutlinePencilSquare className="h-4 w-4" />}>
              Edit Profile
            </Button>
          </Link>
        </div>
      </header>

      {user && !user.isEmailVerified && (
        <Alert tone="warning" title="Verify your email">
          <p className="mb-3">
            Some features stay locked until <span className="font-semibold">{user.email}</span> is
            confirmed.
          </p>
          <Button
            size="sm"
            variant="secondary"
            isLoading={isResending}
            onClick={resendVerification}
            leftIcon={<HiOutlineEnvelope className="h-4 w-4" />}
          >
            Resend verification email
          </Button>
        </Alert>
      )}

      {/* Main Social Grid: Feed & Sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Feed (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Post Composer */}
          <PostComposer />

          {/* Feed List */}
          <section aria-label="Home Feed" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Your Feed</h2>
              <span className="text-xs text-slate-400">Posts from you & your network</span>
            </div>

            <FeedList
              posts={feed.items}
              status={feed.status}
              error={feed.error}
              hasMore={feed.hasMore}
              onLoadMore={handleLoadMore}
              isLoadingMore={loadingMore}
            />
          </section>
        </div>

        {/* Right Sidebar: Profile Status, AI Matches, Communities (1 col) */}
        <aside className="space-y-6">
          {/* Completeness Card */}
          {completeness && (
            <div className="card-surface p-5">
              <h3 className="font-semibold text-sm mb-3">Profile Completeness</h3>
              <CompletenessBar completeness={completeness} />
            </div>
          )}

          {/* AI Match Explorer Widget */}
          <div className="card-surface p-5 border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50/50 to-purple-50/30 dark:from-brand-950/20 dark:to-purple-950/10">
            <div className="flex items-center gap-2 mb-2 text-brand-600 dark:text-brand-400">
              <HiOutlineSparkles className="h-5 w-5" />
              <h3 className="font-bold text-sm">AI Match Explorer</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              Discover professionals and creators sharing your skills, interests, and complementary goals.
            </p>
            <Link to="/matches">
              <Button size="sm" className="w-full">
                View AI Matches
              </Button>
            </Link>
          </div>

          {/* Quick Shortcuts */}
          <div className="card-surface p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Explore</h3>
            <div className="space-y-2">
              <Link
                to="/people"
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <HiOutlineUsers className="h-4 w-4 text-brand-500" />
                  <span>Discover People</span>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
              <Link
                to="/communities"
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <HiOutlineUserGroup className="h-4 w-4 text-indigo-500" />
                  <span>Browse Communities</span>
                </div>
                <span className="text-slate-400">→</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;
