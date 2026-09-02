import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import { clearAuthError, loginUser, selectAuth } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSubmitting, error, fieldErrors } = useSelector(selectAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { identifier: '', password: '' } });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (values) => {
    const result = await dispatch(loginUser(values));
    if (loginUser.fulfilled.match(result)) {
      dispatch(pushToast({ message: `Welcome back, ${result.payload.user.name}`, tone: 'success' }));
      navigate(location.state?.from ?? '/', { replace: true });
    }
  };

  return (
    <section aria-labelledby="login-heading" className="space-y-6">
      <header className="space-y-2">
        <h1 id="login-heading" className="text-2xl font-extrabold tracking-tight">
          Sign in to LikeMinded
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pick up where you left off with your people.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Email or username"
          type="text"
          autoComplete="username"
          placeholder="ada@example.com"
          leftIcon={<HiOutlineEnvelope className="h-5 w-5" />}
          error={errors.identifier?.message ?? fieldErrors.identifier}
          {...register('identifier', {
            required: 'Enter your email or username',
            minLength: { value: 3, message: 'That is too short to be valid' },
          })}
        />

        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message ?? fieldErrors.password}
          {...register('password', { required: 'Enter your password' })}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-brand-600 dark:text-brand-400 text-sm font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{' '}
        <Link to="/register" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
