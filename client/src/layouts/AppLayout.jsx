import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBell,
  HiOutlineHome,
  HiOutlineInbox,
  HiOutlineLink,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineChatBubbleLeftRight,
  HiOutlineSparkles,
  HiOutlineCalendarDays,
  HiOutlineShieldCheck,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import Logo from '@/components/atoms/Logo';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import ThemeToggle from '@/components/molecules/ThemeToggle';
import NotificationsPopover from '@/features/notifications/components/NotificationsPopover';
import { logoutUser, selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: HiOutlineHome },
  { to: '/matches', label: 'AI Matches', icon: HiOutlineSparkles },
  { to: '/messages', label: 'Messages', icon: HiOutlineChatBubbleLeftRight },
  { to: '/people', label: 'People', icon: HiOutlineUsers },
  { to: '/communities', label: 'Communities', icon: HiOutlineUserGroup },
  { to: '/events', label: 'Events', icon: HiOutlineCalendarDays },
  { to: '/connections', label: 'Connections', icon: HiOutlineLink },
];

export function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    dispatch(pushToast({ message: 'Signed out', tone: 'success' }));
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-dvh">
      <header className="glass-panel sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" aria-label="LikeMinded home">
            <Logo />
          </Link>

          <nav aria-label="Primary" className="ml-2 flex items-center gap-1 overflow-x-auto sm:ml-4">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  )
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.target.elements.search?.value?.trim();
                if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
              }}
              className="relative hidden md:block"
            >
              <HiOutlineMagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                name="search"
                type="search"
                placeholder="Search..."
                className="h-9 w-36 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs focus:w-56 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 transition-all"
              />
            </form>

            <Link
              to="/search"
              aria-label="Search"
              className="md:hidden grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <HiOutlineMagnifyingGlass className="h-5 w-5" />
            </Link>

            <ThemeToggle />

            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    title="Admin Portal"
                    className="grid h-10 w-10 place-items-center rounded-xl border border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    <HiOutlineShieldCheck className="h-5 w-5" />
                  </Link>
                )}
                <NotificationsPopover />
                <Link
                  to={user.username ? `/u/${user.username}` : '/settings/profile'}
                  aria-label="Your profile"
                  className="rounded-full"
                >
                  <Avatar name={user.name} src={user.avatar?.url} size="sm" className="ring-2" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<HiOutlineArrowRightOnRectangle className="h-5 w-5" />}
                >
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
