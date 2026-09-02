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
} from 'react-icons/hi2';
import Logo from '@/components/atoms/Logo';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import ThemeToggle from '@/components/molecules/ThemeToggle';
import { logoutUser, selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Feed', icon: HiOutlineHome },
  { to: '/people', label: 'People', icon: HiOutlineUsers },
  { to: '/requests', label: 'Requests', icon: HiOutlineInbox },
  { to: '/connections', label: 'Connections', icon: HiOutlineLink },
  { to: '/communities', label: 'Communities', icon: HiOutlineUserGroup },
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
            <ThemeToggle />

            {user ? (
              <>
                <button
                  type="button"
                  aria-label="Notifications"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <HiOutlineBell className="h-5 w-5" />
                </button>
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
