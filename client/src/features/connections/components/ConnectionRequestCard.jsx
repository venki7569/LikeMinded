import UserCard from './UserCard';
import ConnectionButton from './ConnectionButton';

export function ConnectionRequestCard({ request, direction = 'incoming', onChanged }) {
  if (!request) return null;
  return (
    <UserCard
      user={request.user}
      relationshipStatus={direction === 'incoming' ? 'incoming_pending' : 'outgoing_pending'}
      requestId={request.id}
      mutualConnectionCount={request.mutualConnectionCount}
      onChanged={onChanged}
      actions={
        <ConnectionButton
          userId={request.user.id}
          requestId={request.id}
          relationshipStatus={direction === 'incoming' ? 'incoming_pending' : 'outgoing_pending'}
          onChanged={onChanged}
          compact
        />
      }
    />
  );
}

export default ConnectionRequestCard;
