import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import communitiesApi from '../communitiesApi';
import { fetchCommunity } from '../communitiesSlice';

export function JoinButton({ community, onChanged }) {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!community) return null;
  const viewer = community.viewer ?? {};
  const slug = community.slug;

  const refresh = async (message) => {
    await dispatch(fetchCommunity(slug));
    onChanged?.();
    if (message) dispatch(pushToast({ message, tone: 'success' }));
  };

  const run = async (key, action, successMessage) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await refresh(successMessage);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
      dispatch(pushToast({ message: apiError.message, tone: 'error' }));
    } finally {
      setBusy(null);
      setConfirmLeave(false);
    }
  };

  if (!user) {
    return (
      <Link to="/login">
        <Button>Sign in to join</Button>
      </Link>
    );
  }

  if (viewer.role === 'owner') {
    return (
      <Button variant="secondary" disabled>
        Owner
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {error && <Alert tone="error">{error}</Alert>}
      {!viewer.isMember && !viewer.joinRequestId && (
        <Button
          isLoading={busy === 'join'}
          onClick={() =>
            run(
              'join',
              () => communitiesApi.join(slug),
              community.privacy === 'private' ? 'Request sent' : 'You joined this community'
            )
          }
        >
          {community.privacy === 'private' ? 'Request to join' : 'Join'}
        </Button>
      )}
      {viewer.joinRequestId && (
        <Button
          variant="secondary"
          isLoading={busy === 'cancel'}
          onClick={() =>
            run(
              'cancel',
              () => communitiesApi.cancelJoinRequest(slug, viewer.joinRequestId),
              'Request cancelled'
            )
          }
        >
          Request pending
        </Button>
      )}
      {viewer.isMember && viewer.role !== 'owner' && (
        <Button variant="secondary" onClick={() => setConfirmLeave(true)}>
          Leave
        </Button>
      )}
      <ConfirmDialog
        open={confirmLeave}
        title="Leave this community?"
        description="You can join again later if it is public, or send a new request if it is private."
        confirmLabel="Leave"
        isLoading={busy === 'leave'}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => run('leave', () => communitiesApi.leave(slug), 'You left the community')}
      />
    </div>
  );
}

export default JoinButton;
