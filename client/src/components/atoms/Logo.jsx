import { HiOutlineSparkles } from 'react-icons/hi2';
import { cn } from '@/utils/cn';

export function Logo({ className, showWordmark = true }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="bg-brand-600 grid h-9 w-9 place-items-center rounded-xl text-white">
        <HiOutlineSparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight">
          Like<span className="text-brand-600 dark:text-brand-400">Minded</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
