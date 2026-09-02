import { Skeleton } from '@/components/atoms/Skeleton';
import EmptyState from '@/components/molecules/EmptyState';
import UserCard from './UserCard';

export function PeopleListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading people">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card-surface flex gap-4 p-5">
          <Skeleton className="h-16 w-16" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PeopleList({ items = [], emptyTitle, emptyDescription, onChanged }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle ?? 'No one here yet'} description={emptyDescription} />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.user?.id ?? item.id}>
          <UserCard
            user={item.user}
            relationshipStatus={item.relationshipStatus}
            requestId={item.requestId}
            mutualConnectionCount={item.mutualConnectionCount}
            sharedInterestCount={item.sharedInterestCount}
            onChanged={onChanged}
          />
        </li>
      ))}
    </ul>
  );
}

export default PeopleList;
