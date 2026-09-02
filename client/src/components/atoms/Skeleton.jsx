import { cn } from '@/utils/cn';

/** Shimmering placeholder used while data loads. */
export function Skeleton({ className, rounded = 'rounded-lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block animate-shimmer bg-[length:200%_100%]',
        'bg-linear-to-r from-slate-200 via-slate-100 to-slate-200',
        'dark:from-slate-800 dark:via-slate-700 dark:to-slate-800',
        rounded,
        className
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading content">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export default Skeleton;
