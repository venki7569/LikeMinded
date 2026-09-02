import { forwardRef, useId, useState } from 'react';
import { HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import { cn } from '@/utils/cn';

/**
 * Label + control + error message with the aria wiring already connected, so
 * every form in the app announces validation failures to screen readers.
 */
export const FormField = forwardRef(function FormField(
  {
    label,
    error,
    hint,
    type = 'text',
    leftIcon,
    className,
    id: providedId,
    multiline = false,
    rows = 4,
    ...rest
  },
  ref
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [isRevealed, setIsRevealed] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && isRevealed ? 'text' : type;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ');

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
            {leftIcon}
          </span>
        )}

        {multiline ? (
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors',
              'placeholder:text-slate-400',
              'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
              error
                ? 'border-rose-400 focus:border-rose-500 dark:border-rose-500/60'
                : 'border-slate-300 focus:border-brand-500 dark:border-slate-700'
            )}
            {...rest}
          />
        ) : (
          <input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy || undefined}
            className={cn(
              'h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 transition-colors',
              'placeholder:text-slate-400',
              'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
              leftIcon && 'pl-10',
              isPassword && 'pr-11',
              error
                ? 'border-rose-400 focus:border-rose-500 dark:border-rose-500/60'
                : 'border-slate-300 focus:border-brand-500 dark:border-slate-700'
            )}
            {...rest}
          />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsRevealed((value) => !value)}
            aria-label={isRevealed ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {isRevealed ? (
              <HiOutlineEyeSlash className="h-5 w-5" />
            ) : (
              <HiOutlineEye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
});

export default FormField;
