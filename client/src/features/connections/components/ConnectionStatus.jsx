import { cn } from '@/utils/cn';

const LABELS = {
  none: { text: 'Not connected', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  outgoing_pending: {
    text: 'Request sent',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  incoming_pending: {
    text: 'Wants to connect',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  connected: {
    text: 'Connected',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  blocked: {
    text: 'Blocked',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
};

export function ConnectionStatus({ status = 'none', className }) {
  const label = LABELS[status] ?? LABELS.none;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        label.className,
        className
      )}
    >
      {label.text}
    </span>
  );
}

export default ConnectionStatus;
