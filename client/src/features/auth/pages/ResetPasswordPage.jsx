import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import { resetPassword, selectAuth } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function ResetPasswordPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isSubmitting, error } = useSelector(selectAuth);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = async ({ password }) => {
    const result = await dispatch(resetPassword({ token, password }));
    if (resetPassword.fulfilled.match(result)) {
      dispatch(pushToast({ message: 'Password updated. Please sign in.', tone: 'success' }));
      navigate('/login', { replace: true });
    }
  };

  if (!token) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Reset link is incomplete</h1>
        <Alert tone="error" title="Missing token">
          Open the link from your email again, or request a new one.
        </Alert>
        <Link to="/forgot-password">
          <Button fullWidth variant="secondary">
            Request a new link
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="reset-heading" className="space-y-6">
      <header className="space-y-2">
        <h1 id="reset-heading" className="text-2xl font-extrabold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          For your security, every other session will be signed out.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password', {
            required: 'Choose a password',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
            validate: {
              hasLetter: (value) => /[a-zA-Z]/.test(value) || 'Include at least one letter',
              hasNumber: (value) => /\d/.test(value) || 'Include at least one number',
            },
          })}
        />

        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (value) => value === getValues('password') || 'Passwords do not match',
          })}
        />

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </section>
  );
}

export default ResetPasswordPage;
