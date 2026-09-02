import { cn } from '@/utils/cn';

const MISSING_LABELS = {
  bio: 'Write a bio',
  skills: 'Add at least 3 skills',
  interests: 'Add at least 3 interests',
  occupation: 'Add your occupation',
  education: 'Add education',
  experience: 'Add experience',
  projects: 'Add a project',
  location: 'Add a location',
  profileImage: 'Add a profile photo',
  coverImage: 'Add a cover image',
  socials: 'Add a social link',
};

export function CompletenessBar({ completeness, compact = false, className }) {
  const percentage = completeness?.percentage ?? 0;
  const missing = completeness?.missing ?? [];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-semibold">Profile completeness</p>
        <p className="text-brand-600 dark:text-brand-400 font-bold">{percentage}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
      >
        <span
          className="bg-brand-600 block h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {!compact && missing.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Next: {missing.slice(0, 3).map((field) => MISSING_LABELS[field] ?? field).join(' · ')}
        </p>
      )}
    </div>
  );
}

export default CompletenessBar;
