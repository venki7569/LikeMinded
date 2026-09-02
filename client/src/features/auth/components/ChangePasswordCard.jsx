import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import authApi from '@/features/auth/authApi';
import { sessionExpired } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';

export function ChangePasswordCard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      dispatch(pushToast({ message: 'Password changed. Please sign in again.', tone: 'success' }));
      // The server revokes every session on a password change.
      dispatch(sessionExpired());
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(toApiError(requestError).message);
    }
  };

  return (
    <section className="card-surface space-y-4 p-6">
      <header>
        <h2 className="font-bold">Change password</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Changing your password signs you out everywhere.
        </p>
      </header>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword', { required: 'Enter your current password' })}
        />

        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.newPassword?.message}
          {...register('newPassword', {
            required: 'Choose a new password',
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
            required: 'Confirm your new password',
            validate: (value) => value === getValues('newPassword') || 'Passwords do not match',
          })}
        />

        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </section>
  );
}

export default ChangePasswordCard;
