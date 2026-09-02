import { HiOutlineInbox } from 'react-icons/hi2';
import { cn } from '@/utils/cn';

export function EmptyState({ icon: Icon = HiOutlineInbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-14 text-center',
        'border-slate-300 dark:border-slate-700',
        className
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
