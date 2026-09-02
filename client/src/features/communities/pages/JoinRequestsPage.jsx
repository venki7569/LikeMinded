import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import EmptyState from '@/components/molecules/EmptyState';
import Pagination from '@/components/molecules/Pagination';
import { PeopleListSkeleton } from '@/features/connections/components/PeopleList';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import communitiesApi from '../communitiesApi';
import { fetchCommunity, fetchJoinRequests, selectJoinRequests } from '../communitiesSlice';

export function JoinRequestsPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { items, meta, status, error } = useSelector(selectJoinRequests);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchCommunity(slug));
    dispatch(fetchJoinRequests({ slug, page, limit: 12, status: 'pending' }));
  }, [dispatch, slug, page]);

  const act = async (fn, message) => {
    try {
      await fn();
      dispatch(pushToast({ message, tone: 'success' }));
      dispatch(fetchJoinRequests({ slug, page, limit: 12, status: 'pending' }));
      dispatch(fetchCommunity(slug));
    } catch (err) {
      dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate-500">
          <Link to={`/communities/${slug}`} className="hover:underline">
            Back to community
          </Link>
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Join requests</h1>
      </header>

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      {status === 'loading' || status === 'idle' ? (
        <PeopleListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="No pending requests" description="New requests to join will land here." />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((request) => (
              <li key={request.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
                <Avatar name={request.user.displayName} src={request.user.profileImage?.url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{request.user.displayName}</p>
                  <p className="text-sm text-slate-500">@{request.user.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      act(
                        () => communitiesApi.approveJoinRequest(slug, request.id),
                        'Request approved'
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      act(
                        () => communitiesApi.rejectJoinRequest(slug, request.id),
                        'Request declined'
                      )
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default JoinRequestsPage;
