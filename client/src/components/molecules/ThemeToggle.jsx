import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi2';
import { selectTheme, toggleTheme } from '@/features/theme/themeSlice';

export function ThemeToggle({ className }) {
  const dispatch = useDispatch();
  const mode = useSelector(selectTheme);
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${className ?? ''}`}
    >
      {isDark ? <HiOutlineSun className="h-5 w-5" /> : <HiOutlineMoon className="h-5 w-5" />}
    </button>
  );
}

export default ThemeToggle;
