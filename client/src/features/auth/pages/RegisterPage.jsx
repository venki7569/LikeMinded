import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineAtSymbol, HiOutlineEnvelope, HiOutlineUser } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import { clearAuthError, registerUser, selectAuth } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSubmitting, error, fieldErrors } = useSelector(selectAuth);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', username: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const onSubmit = async (values) => {
    const result = await dispatch(registerUser(values));
    if (registerUser.fulfilled.match(result)) {
      dispatch(
        pushToast({ message: 'Account created. Check your inbox to verify.', tone: 'success' })
      );
      navigate('/', { replace: true });
    }
  };

  return (
    <section aria-labelledby="register-heading" className="space-y-6">
      <header className="space-y-2">
        <h1 id="register-heading" className="text-2xl font-extrabold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          It takes a minute. Your matches improve as you add skills and interests.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          leftIcon={<HiOutlineUser className="h-5 w-5" />}
          error={errors.name?.message ?? fieldErrors.name}
          {...register('name', {
            required: 'Enter your name',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
          })}
        />

        <FormField
          label="Username"
          autoComplete="username"
          placeholder="ada"
          hint="Letters, numbers and underscores only."
          leftIcon={<HiOutlineAtSymbol className="h-5 w-5" />}
          error={errors.username?.message ?? fieldErrors.username}
          {...register('username', {
            required: 'Choose a username',
            minLength: { value: 3, message: 'Username must be at least 3 characters' },
            pattern: {
              value: /^[a-zA-Z0-9_]+$/,
              message: 'Only letters, numbers and underscores',
            },
          })}
        />

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ada@example.com"
          leftIcon={<HiOutlineEnvelope className="h-5 w-5" />}
          error={errors.email?.message ?? fieldErrors.email}
          {...register('email', {
            required: 'Enter your email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
          })}
        />

        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message ?? fieldErrors.password}
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
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message ?? fieldErrors.confirmPassword}
          {...register('confirmPassword', {
            required: 'Confirm your password',
            validate: (value) => value === getValues('password') || 'Passwords do not match',
          })}
        />

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}

export default RegisterPage;
