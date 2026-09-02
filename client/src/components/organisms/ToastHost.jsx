import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { dismissToast, selectToasts } from '@/features/ui/toastSlice';

const TONES = {
  info: { icon: HiOutlineInformationCircle, accent: 'text-sky-500' },
  success: { icon: HiOutlineCheckCircle, accent: 'text-emerald-500' },
  warning: { icon: HiOutlineExclamationTriangle, accent: 'text-amber-500' },
  error: { icon: HiOutlineXCircle, accent: 'text-rose-500' },
};

function Toast({ toast }) {
  const dispatch = useDispatch();
  const { icon: Icon, accent } = TONES[toast.tone] ?? TONES.info;

  useEffect(() => {
    if (!toast.duration) return undefined;
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.duration);
    return () => clearTimeout(timer);
  }, [dispatch, toast.duration, toast.id]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.97 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="glass-panel pointer-events-auto flex w-80 items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accent}`} aria-hidden="true" />
      <p className="flex-1 text-sm text-slate-800 dark:text-slate-100">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss notification"
        className="text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
      >
        <HiOutlineXMark className="h-4 w-4" />
      </button>
    </motion.li>
  );
}

export function ToastHost() {
  const toasts = useSelector(selectToasts);

  return (
    <ul
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

export default ToastHost;
