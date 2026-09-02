import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineEnvelope, HiOutlineEnvelopeOpen } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import { forgotPassword, selectAuth } from '@/features/auth/authSlice';

export function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { isSubmitting, error } = useSelector(selectAuth);
  const [sentTo, setSentTo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) setSentTo(email);
  };

  if (sentTo) {
    return (
      <section className="space-y-6 text-center">
        <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 mx-auto grid h-14 w-14 place-items-center rounded-2xl">
          <HiOutlineEnvelopeOpen className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Check your inbox</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If an account exists for <span className="font-semibold">{sentTo}</span>, we have sent a
            reset link. It expires in one hour.
          </p>
        </div>
        <Button variant="secondary" fullWidth onClick={() => setSentTo(null)}>
          Use a different address
        </Button>
        <Link
          to="/login"
          className="text-brand-600 dark:text-brand-400 block text-sm font-semibold hover:underline"
        >
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="forgot-heading" className="space-y-6">
      <header className="space-y-2">
        <h1 id="forgot-heading" className="text-2xl font-extrabold tracking-tight">
          Forgot your password?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter your email and we will send a link to set a new one.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ada@example.com"
          leftIcon={<HiOutlineEnvelope className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email', {
            required: 'Enter your email',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
          })}
        />

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>

      <Link
        to="/login"
        className="text-brand-600 dark:text-brand-400 block text-center text-sm font-semibold hover:underline"
      >
        Back to sign in
      </Link>
    </section>
  );
}

export default ForgotPasswordPage;
