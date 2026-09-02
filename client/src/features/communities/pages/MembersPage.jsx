import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@/components/atoms/Alert';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import Pagination from '@/components/molecules/Pagination';
import ConfirmDialog from '@/components/molecules/ConfirmDialog';
import { pushToast } from '@/features/ui/toastSlice';
import { toApiError } from '@/services/apiClient';
import communitiesApi from '../communitiesApi';
import {
  fetchCommunity,
  fetchMembers,
  selectCommunityMembers,
  selectCurrentCommunity,
} from '../communitiesSlice';

export function MembersPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { community } = useSelector(selectCurrentCommunity);
  const { items, meta, status, error } = useSelector(selectCommunityMembers);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);

  const viewer = community?.viewer ?? {};

  useEffect(() => {
    dispatch(fetchCommunity(slug));
  }, [dispatch, slug]);

  useEffect(() => {
    const params = { slug, page, limit: 12 };
    if (q) params.q = q;
    if (role) params.role = role;
    dispatch(fetchMembers(params));
  }, [dispatch, slug, page, q, role]);

  const refresh = () => dispatch(fetchMembers({ slug, page, limit: 12, q, role }));

  const run = async (action, message) => {
    try {
      await action();
      dispatch(pushToast({ message, tone: 'success' }));
      setPending(null);
      refresh();
      dispatch(fetchCommunity(slug));
    } catch (err) {
      dispatch(pushToast({ message: toApiError(err).message, tone: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            <Link to={`/communities/${slug}`} className="hover:underline">
              {community?.name ?? slug}
            </Link>
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">Members</h1>
        </div>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          refresh();
        }}
      >
        <FormField
          className="flex-1"
          label="Search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="space-y-1.5">
          <label htmlFor="role-filter" className="block text-sm font-medium">
            Role
          </label>
          <select
            id="role-filter"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All roles</option>
            <option value="owner">Owner</option>
            <option value="moderator">Moderator</option>
            <option value="member">Member</option>
          </select>
        </div>
      </form>

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
            <Avatar name={row.user.displayName} src={row.user.profileImage?.url} size="sm" />
            <div className="min-w-0 flex-1">
              <Link to={`/u/${row.user.username}`} className="font-semibold hover:underline">
                {row.user.displayName}
              </Link>
              <p className="text-sm capitalize text-slate-500">
                @{row.user.username} · {row.role}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewer.role === 'owner' && row.role === 'member' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    run(
                      () => communitiesApi.promoteModerator(slug, row.user.id),
                      `${row.user.displayName} is now a moderator`
                    )
                  }
                >
                  Make moderator
                </Button>
              )}
              {viewer.role === 'owner' && row.role === 'moderator' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    run(
                      () => communitiesApi.demoteModerator(slug, row.user.id),
                      `${row.user.displayName} is now a member`
                    )
                  }
                >
                  Demote
                </Button>
              )}
              {viewer.canManageMembers && row.role !== 'owner' && (
                <Button size="sm" variant="danger" onClick={() => setPending(row)}>
                  Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pagination meta={meta} onPageChange={setPage} />

      <ConfirmDialog
        open={Boolean(pending)}
        title="Remove this member?"
        description={
          pending ? `${pending.user.displayName} will lose access until they join again.` : ''
        }
        confirmLabel="Remove"
        onCancel={() => setPending(null)}
        onConfirm={() =>
          pending &&
          run(
            () => communitiesApi.removeMember(slug, pending.user.id),
            'Member removed'
          )
        }
      />
    </div>
  );
}

export default MembersPage;
