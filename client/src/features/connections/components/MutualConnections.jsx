import { Link } from 'react-router-dom';

export function MutualConnections({ count = 0, className }) {
  if (!count) return null;
  return (
    <p className={className ?? 'text-sm text-slate-500 dark:text-slate-400'}>
      {count} mutual connection{count === 1 ? '' : 's'}
    </p>
  );
}

export function SharedInterests({ count = 0 }) {
  if (!count) return null;
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {count} shared interest{count === 1 ? '' : 's'}
    </p>
  );
}

export function ViewProfileLink({ username, children = 'View profile' }) {
  return (
    <Link
      to={`/u/${username}`}
      className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline"
    >
      {children}
    </Link>
  );
}

export default MutualConnections;
