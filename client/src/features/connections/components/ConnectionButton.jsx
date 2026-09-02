import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import connectionsApi from '@/features/connections/connectionsApi';
import { rememberRelationship } from '@/features/connections/connectionsSlice';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import ConnectionStatus from './ConnectionStatus';

export function ConnectionButton({
  userId,
  requestId: requestIdProp,
  relationshipStatus,
  onChanged,
  showStatus = false,
  compact = false,
}) {
  const dispatch = useDispatch();
  const [status, setStatus] = useState(relationshipStatus ?? 'none');
  const [requestId, setRequestId] = useState(requestIdProp ?? null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState(null);
  const [isHydrating, setIsHydrating] = useState(!relationshipStatus && Boolean(userId));

  useEffect(() => {
    if (relationshipStatus) setStatus(relationshipStatus);
  }, [relationshipStatus]);

  useEffect(() => {
    if (requestIdProp) setRequestId(requestIdProp);
  }, [requestIdProp]);

  useEffect(() => {
    if (!userId || relationshipStatus) return undefined;
    let cancelled = false;
    connectionsApi
      .getStatus(userId)
      .then((response) => {
        if (cancelled) return;
        const relationship = response.data?.data?.relationship;
        if (!relationship) return;
        setStatus(relationship.status);
        setRequestId(relationship.requestId);
        dispatch(rememberRelationship({ userId, relationship }));
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('none');
          setError('Unable to load connection status');
        }
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, relationshipStatus, userId]);

  const applyRelationship = (relationship) => {
    if (!relationship) return;
    setStatus(relationship.status);
    setRequestId(relationship.requestId ?? null);
    dispatch(rememberRelationship({ userId, relationship }));
    onChanged?.(relationship);
  };

  const run = async (key, action, successMessage) => {
    setBusy(key);
    setError(null);
    try {
      const response = await action();
      applyRelationship(response.data?.data?.relationship);
      if (successMessage) dispatch(pushToast({ message: successMessage, tone: 'success' }));
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
      dispatch(pushToast({ message: apiError.message, tone: 'error' }));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  };

  const size = compact ? 'sm' : 'md';

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {error && (
        <Alert tone="error" className="w-full text-left">
          {error}
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {showStatus && <ConnectionStatus status={status} />}

        {isHydrating && (
          <Button size={size} isLoading>
            Connect
          </Button>
        )}

        {!isHydrating && status === 'none' && (
          <Button
            size={size}
            isLoading={busy === 'connect'}
            onClick={() => run('connect', () => connectionsApi.sendRequest(userId), 'Request sent')}
          >
            Connect
          </Button>
        )}

        {!isHydrating && status === 'outgoing_pending' && (
          <>
            <Button size={size} variant="secondary" disabled>
              Request Sent
            </Button>
            <Button
              size={size}
              variant="ghost"
              isLoading={busy === 'cancel'}
              onClick={() =>
                run('cancel', () => connectionsApi.cancelRequest(requestId), 'Request cancelled')
              }
              disabled={!requestId}
            >
              Cancel
            </Button>
          </>
        )}

        {!isHydrating && status === 'incoming_pending' && (
          <>
            <Button
              size={size}
              isLoading={busy === 'accept'}
              onClick={() =>
                run('accept', () => connectionsApi.acceptRequest(requestId), 'You are now connected')
              }
              disabled={!requestId}
            >
              Accept
            </Button>
            <Button
              size={size}
              variant="secondary"
              isLoading={busy === 'reject'}
              onClick={() =>
                run('reject', () => connectionsApi.rejectRequest(requestId), 'Request declined')
              }
              disabled={!requestId}
            >
              Reject
            </Button>
          </>
        )}

        {!isHydrating && status === 'connected' && (
          <>
            <Button size={size} variant="secondary" disabled>
              Connected
            </Button>
            <Button size={size} variant="ghost" onClick={() => setConfirm('remove')}>
              Remove
            </Button>
          </>
        )}

        {!isHydrating && status === 'blocked' && (
          <Button
            size={size}
            variant="secondary"
            isLoading={busy === 'unblock'}
            onClick={() =>
              run('unblock', () => connectionsApi.unblockUser(userId), 'User unblocked')
            }
          >
            Unblock
          </Button>
        )}

        {!isHydrating && status !== 'blocked' && status !== 'none' && (
          <Button size={size} variant="ghost" onClick={() => setConfirm('block')}>
            Block
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'remove'}
        title="Remove this connection?"
        description="You can send a new request later if you change your mind."
        confirmLabel="Remove"
        isLoading={busy === 'remove'}
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          run('remove', () => connectionsApi.removeConnection(userId), 'Connection removed')
        }
      />
      <ConfirmDialog
        open={confirm === 'block'}
        title="Block this person?"
        description="Pending requests will be cancelled and they will not be able to contact you."
        confirmLabel="Block"
        isLoading={busy === 'block'}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run('block', () => connectionsApi.blockUser(userId), 'User blocked')}
      />
    </div>
  );
}

export default ConnectionButton;
