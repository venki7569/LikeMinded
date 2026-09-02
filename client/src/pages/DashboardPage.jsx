import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCheckBadge,
  HiOutlineDevicePhoneMobile,
  HiOutlineEnvelope,
} from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import ChangePasswordCard from '@/features/auth/components/ChangePasswordCard';
import authApi from '@/features/auth/authApi';
import { selectCurrentUser, sessionExpired } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

export function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [isResending, setIsResending] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);

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

  const signOutEverywhere = async () => {
    setIsSigningOutAll(true);
    try {
      await authApi.logoutAll();
      dispatch(sessionExpired());
      navigate('/login', { replace: true });
    } catch (error) {
      dispatch(pushToast({ message: toApiError(error).message, tone: 'error' }));
    } finally {
      setIsSigningOutAll(false);
    }
  };

  const joinedOn = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Hello, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your account is ready. Profiles, matching and communities arrive in the next modules.
        </p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-6">
          <header className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Account</h2>
            {user?.isEmailVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <HiOutlineCheckBadge className="h-4 w-4" />
                Verified
              </span>
            )}
          </header>

          <dl className="divide-y divide-slate-200 dark:divide-slate-800">
            <DetailRow label="Name" value={user?.name ?? '—'} />
            <DetailRow label="Username" value={`@${user?.username ?? ''}`} />
            <DetailRow label="Email" value={user?.email ?? '—'} />
            <DetailRow label="Role" value={user?.role ?? '—'} />
            <DetailRow label="Member since" value={joinedOn} />
          </dl>
        </section>

        <div className="space-y-6">
          <ChangePasswordCard />

          <section className="card-surface space-y-3 p-6">
            <header>
              <h2 className="font-bold">Active sessions</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Revoke every refresh token if you signed in on a device you no longer trust.
              </p>
            </header>
            <Button
              variant="danger"
              isLoading={isSigningOutAll}
              onClick={signOutEverywhere}
              leftIcon={<HiOutlineDevicePhoneMobile className="h-5 w-5" />}
            >
              Sign out of all devices
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
