import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import EmptyState from '@/components/molecules/EmptyState';
import Pagination from '@/components/molecules/Pagination';
import { PeopleListSkeleton } from '@/features/connections/components/PeopleList';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import CommunityCard from '../components/CommunityCard';
import communitiesApi from '../communitiesApi';
import { fetchInvitations, selectInvitations } from '../communitiesSlice';

export function InvitationsPage() {
  const dispatch = useDispatch();
  const { items, meta, status, error } = useSelector(selectInvitations);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchInvitations({ page, limit: 12 }));
  }, [dispatch, page]);

  const act = async (fn, message) => {
    try {
      await fn();
      dispatch(pushToast({ message, tone: 'success' }));
      dispatch(fetchInvitations({ page, limit: 12 }));
    } catch (err) {
      dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Community invitations</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Accept to join immediately, even if the group is private.
        </p>
      </header>

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      {status === 'loading' || status === 'idle' ? (
        <PeopleListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No invitations"
          description="When a moderator invites you, it will show up here."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((invitation) => (
              <li key={invitation.id} className="space-y-3">
                <CommunityCard
                  community={invitation.community}
                  action={
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          act(
                            () => communitiesApi.acceptInvitation(invitation.id),
                            'You joined the community'
                          )
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          act(
                            () => communitiesApi.rejectInvitation(invitation.id),
                            'Invitation declined'
                          )
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  }
                />
                {invitation.inviter && (
                  <p className="px-1 text-sm text-slate-500">
                    Invited by{' '}
                    <Link to={`/u/${invitation.inviter.username}`} className="font-medium hover:underline">
                      {invitation.inviter.displayName}
                    </Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default InvitationsPage;
