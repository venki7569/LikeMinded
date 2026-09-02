import { Link } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineUserGroup } from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import { categoryLabel } from '../categories';

export function PrivacyBadge({ privacy }) {
  if (privacy !== 'private') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        Public
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
      <HiOutlineLockClosed className="h-3.5 w-3.5" />
      Private
    </span>
  );
}

export function CommunityCard({ community, action }) {
  if (!community) return null;
  return (
    <article className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <Link to={`/communities/${community.slug}`} className="shrink-0">
        <Avatar name={community.name} src={community.avatar?.url} size="md" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/communities/${community.slug}`} className="font-bold hover:underline">
            {community.name}
          </Link>
          <PrivacyBadge privacy={community.privacy} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {categoryLabel(community.category)} · {community.memberCount} member
          {community.memberCount === 1 ? '' : 's'}
        </p>
        {community.description && (
          <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
            {community.description}
          </p>
        )}
        {community.interests?.length > 0 && (
          <p className="text-xs text-slate-500">{community.interests.slice(0, 4).join(' · ')}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </article>
  );
}

export function MemberCount({ count }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      <HiOutlineUserGroup className="h-4 w-4" />
      {count} member{count === 1 ? '' : 's'}
    </span>
  );
}

export default CommunityCard;
