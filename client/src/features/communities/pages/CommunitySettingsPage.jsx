import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import TagInput from '@/components/molecules/TagInput';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import profileApi from '@/features/profile/profileApi';
import { COMMUNITY_CATEGORIES } from '../categories';
import communitiesApi from '../communitiesApi';
import { fetchCommunity, selectCurrentCommunity } from '../communitiesSlice';

export function CommunitySettingsPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { community, status, error } = useSelector(selectCurrentCommunity);
  const [interests, setInterests] = useState([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [transferUsername, setTransferUsername] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  useEffect(() => {
    dispatch(fetchCommunity(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    if (!community) return;
    reset({
      name: community.name,
      description: community.description ?? '',
      category: community.category,
      privacy: community.privacy,
      avatarUrl: community.avatar?.url ?? '',
      coverImageUrl: community.coverImage?.url ?? '',
    });
    setInterests(community.interests ?? []);
  }, [community, reset]);

  if (status === 'failed') return <Alert tone="error">{error}</Alert>;
  if (!community) return null;

  const viewer = community.viewer ?? {};
  if (!viewer.canEdit && !viewer.canDelete) {
    return <Alert tone="error">You do not have permission to manage this community.</Alert>;
  }

  const save = async (values) => {
    setFormError(null);
    try {
      await communitiesApi.update(slug, {
        name: values.name,
        description: values.description,
        category: values.category,
        interests,
        avatar: { url: values.avatarUrl },
        coverImage: { url: values.coverImageUrl },
        ...(viewer.canDelete ? { privacy: values.privacy } : {}),
      });
      dispatch(pushToast({ message: 'Community updated', tone: 'success' }));
      dispatch(fetchCommunity(slug));
    } catch (err) {
      setFormError(toApiError(err).message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-sm text-slate-500">
          <Link to={`/communities/${slug}`} className="hover:underline">
            {community.name}
          </Link>
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      </header>

      {formError && <Alert tone="error">{formError}</Alert>}

      <form className="card-surface space-y-4 p-6" onSubmit={handleSubmit(save)}>
        <FormField label="Name" {...register('name', { required: true, minLength: 2 })} />
        <FormField label="Description" multiline rows={5} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="settings-category" className="block text-sm font-medium">
              Category
            </label>
            <select
              id="settings-category"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              {...register('category')}
              disabled={!viewer.canEdit}
            >
              {COMMUNITY_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-2" disabled={!viewer.canDelete}>
            <legend className="text-sm font-medium">Privacy</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="public" {...register('privacy')} /> Public
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="private" {...register('privacy')} /> Private
            </label>
            {!viewer.canDelete && (
              <p className="text-xs text-slate-500">Only the owner can change privacy.</p>
            )}
          </fieldset>
        </div>
        <TagInput label="Interests" values={interests} onChange={setInterests} />
        <FormField label="Avatar URL" {...register('avatarUrl')} />
        <FormField label="Cover image URL" {...register('coverImageUrl')} />
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
        </Button>
      </form>

      {viewer.canInvite && (
        <section className="card-surface space-y-3 p-6">
          <h2 className="font-bold">Invite a member</h2>
          <p className="text-sm text-slate-500">Invite by username. They will see it under Invitations.</p>
          <FormField
            label="Username"
            value={inviteUsername}
            onChange={(event) => setInviteUsername(event.target.value)}
          />
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const response = await profileApi.getByUsername(inviteUsername.trim().toLowerCase());
                const userId = response.data?.data?.profile?.id;
                if (!userId) throw new Error('User not found');
                await communitiesApi.invite(slug, userId);
                dispatch(pushToast({ message: 'Invitation sent', tone: 'success' }));
                setInviteUsername('');
              } catch (err) {
                dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
              }
            }}
          >
            Send invitation
          </Button>
        </section>
      )}

      {viewer.canTransfer && (
        <section className="card-surface space-y-3 p-6">
          <h2 className="font-bold">Transfer ownership</h2>
          <p className="text-sm text-slate-500">
            The new owner must already be a member. You will become a moderator.
          </p>
          <FormField
            label="New owner username"
            value={transferUsername}
            onChange={(event) => setTransferUsername(event.target.value)}
          />
          <Button variant="secondary" onClick={() => setConfirm('transfer')}>
            Transfer ownership
          </Button>
        </section>
      )}

      {viewer.canManageRequests && (
        <Link
          to={`/communities/${slug}/requests`}
          className="text-brand-600 dark:text-brand-400 block font-semibold hover:underline"
        >
          Review join requests
        </Link>
      )}

      {viewer.canDelete && (
        <section className="card-surface space-y-3 border-rose-200 p-6 dark:border-rose-900">
          <h2 className="font-bold text-rose-700 dark:text-rose-300">Danger zone</h2>
          <p className="text-sm text-slate-500">
            Deleting removes memberships, invitations and join requests. This cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setConfirm('delete')}>
            Delete community
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirm === 'transfer'}
        title="Transfer ownership?"
        description="You will become a moderator and lose owner-only actions."
        confirmLabel="Transfer"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await communitiesApi.transferOwnership(
              slug,
              (
                await profileApi.getByUsername(transferUsername.trim().toLowerCase())
              ).data?.data?.profile?.id
            );
            dispatch(pushToast({ message: 'Ownership transferred', tone: 'success' }));
            setConfirm(null);
            dispatch(fetchCommunity(slug));
          } catch (err) {
            dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
          }
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this community?"
        description="Every membership, invitation and join request will be removed."
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await communitiesApi.remove(slug);
            dispatch(pushToast({ message: 'Community deleted', tone: 'success' }));
            navigate('/communities', { replace: true });
          } catch (err) {
            dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
          }
        }}
      />
    </div>
  );
}

export default CommunitySettingsPage;
