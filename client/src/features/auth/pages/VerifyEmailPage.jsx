import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi2';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import { verifyEmail } from '@/features/auth/authSlice';

export function VerifyEmailPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState(token ? 'verifying' : 'missing');
  const [message, setMessage] = useState('');
  // Strict Mode double-invokes effects; the token is single-use so guard it.
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;

    dispatch(verifyEmail(token)).then((result) => {
      if (verifyEmail.fulfilled.match(result)) {
        setStatus('verified');
      } else {
        setStatus('failed');
        setMessage(result.payload?.message ?? 'This link is invalid or has expired.');
      }
    });
  }, [dispatch, token]);

  if (status === 'verifying') {
    return (
      <section className="space-y-4 text-center">
        <Spinner size="lg" className="text-brand-600 mx-auto" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Verifying your email…</p>
      </section>
    );
  }

  if (status === 'verified') {
    return (
      <section className="space-y-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
          <HiOutlineCheckCircle className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Email verified</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your account is fully active. Welcome aboard.
          </p>
        </div>
        <Link to="/">
          <Button fullWidth size="lg">
            Go to your feed
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <HiOutlineXCircle className="h-8 w-8" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {status === 'missing' ? 'Verification link incomplete' : 'Verification failed'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {status === 'missing'
            ? 'Open the link from your email again.'
            : message}
        </p>
      </div>
      <Link to="/">
        <Button variant="secondary" fullWidth>
          Back to LikeMinded
        </Button>
      </Link>
    </section>
  );
}

export default VerifyEmailPage;
