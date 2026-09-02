import { Link } from 'react-router-dom';
import Avatar from '@/components/atoms/Avatar';
import ConnectionButton from './ConnectionButton';
import MutualConnections, { SharedInterests } from './MutualConnections';
import ConnectionStatus from './ConnectionStatus';

export function UserCard({
  user,
  relationshipStatus = 'none',
  requestId,
  mutualConnectionCount = 0,
  sharedInterestCount = 0,
  onChanged,
  actions,
}) {
  if (!user) return null;
  const location = [user.location?.city, user.location?.country].filter(Boolean).join(', ');

  return (
    <article className="card-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <Link to={`/u/${user.username}`} className="shrink-0">
        <Avatar name={user.displayName} src={user.profileImage?.url} size="md" />
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/u/${user.username}`} className="font-bold hover:underline">
            {user.displayName}
          </Link>
          <ConnectionStatus status={relationshipStatus} />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
        {user.occupation && <p className="text-sm">{user.occupation}</p>}
        {location && <p className="text-sm text-slate-500 dark:text-slate-400">{location}</p>}
        <SharedInterests count={sharedInterestCount} />
        <MutualConnections count={mutualConnectionCount} />
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        {actions ?? (
          <ConnectionButton
            userId={user.id}
            requestId={requestId}
            relationshipStatus={relationshipStatus}
            onChanged={onChanged}
            compact
          />
        )}
      </div>
    </article>
  );
}

export default UserCard;
