import { cn } from '@/utils/cn';

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';
}

export function Avatar({ name, src, size = 'md', className }) {
  const sizes = {
    sm: 'h-10 w-10 text-sm',
    md: 'h-16 w-16 text-lg',
    lg: 'h-28 w-28 text-3xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile photo` : 'Profile photo'}
        className={cn('rounded-full object-cover ring-4 ring-white dark:ring-slate-900', sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-brand-600 grid place-items-center rounded-full font-bold text-white ring-4 ring-white dark:ring-slate-900',
        sizes[size],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export default Avatar;
