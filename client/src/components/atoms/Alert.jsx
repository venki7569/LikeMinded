import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import { cn } from '@/utils/cn';

const TONES = {
  info: {
    icon: HiOutlineInformationCircle,
    className:
      'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/30',
  },
  success: {
    icon: HiOutlineCheckCircle,
    className:
      'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30',
  },
  warning: {
    icon: HiOutlineExclamationTriangle,
    className:
      'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
  },
  error: {
    icon: HiOutlineXCircle,
    className:
      'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/30',
  },
};

export function Alert({ tone = 'info', title, children, className }) {
  const { icon: Icon, className: toneClassName } = TONES[tone] ?? TONES.info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', toneClassName, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export default Alert;
