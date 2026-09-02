import { Link, useRouteError } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineMagnifyingGlass, HiOutlineBugAnt } from 'react-icons/hi2';
import Button from '@/components/atoms/Button';
import Logo from '@/components/atoms/Logo';

function ErrorShell({ icon: Icon, code, title, description, children }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>

        <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 mx-auto grid h-16 w-16 place-items-center rounded-2xl">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>

        <div className="space-y-2">
          <p className="text-brand-600 dark:text-brand-400 text-sm font-bold tracking-widest">
            {code}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        {children ?? (
          <Link to="/">
            <Button size="lg">Back to LikeMinded</Button>
          </Link>
        )}
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <ErrorShell
      icon={HiOutlineMagnifyingGlass}
      code="404"
      title="We could not find that page"
      description="The link may be broken, or the page may have been moved."
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorShell
      icon={HiOutlineLockClosed}
      code="403"
      title="You do not have access"
      description="This area needs different permissions on your account."
    />
  );
}

/** Rendered by the router when a route throws during render or loading. */
export function RouteErrorPage() {
  const error = useRouteError();

  return (
    <ErrorShell
      icon={HiOutlineBugAnt}
      code="500"
      title="Something broke on our side"
      description={
        import.meta.env.MODE === 'production'
          ? 'We hit an unexpected error. Please try again.'
          : (error?.message ?? 'Unknown render error')
      }
    >
      <Button size="lg" onClick={() => window.location.reload()}>
        Reload the page
      </Button>
    </ErrorShell>
  );
}

export default NotFoundPage;
