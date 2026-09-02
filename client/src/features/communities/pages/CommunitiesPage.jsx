import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineUserGroup } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import EmptyState from '@/components/molecules/EmptyState';
import FormField from '@/components/molecules/FormField';
import Pagination from '@/components/molecules/Pagination';
import { selectCurrentUser } from '@/features/auth/authSlice';
import CommunityCard from '../components/CommunityCard';
import JoinButton from '../components/JoinButton';
import { COMMUNITY_CATEGORIES } from '../categories';
import { fetchCommunities, selectCommunityList, setCommunityFilters } from '../communitiesSlice';

function ListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading communities">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="card-surface flex gap-4 p-5">
          <Skeleton className="h-16 w-16" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommunitiesPage() {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const { items, meta, status, error, filters } = useSelector(selectCommunityList);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    const params = { page, limit: 12, sort: filters.sort || 'newest' };
    if (filters.q) params.q = filters.q;
    if (filters.category) params.category = filters.category;
    if (filters.interest) params.interest = filters.interest;
    dispatch(fetchCommunities(params));
  }, [dispatch, filters, page]);

  const apply = (event) => {
    event.preventDefault();
    setPage(1);
    dispatch(setCommunityFilters(draft));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Communities</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Find groups around skills and interests. Matching scores come later — this is a plain
            search.
          </p>
        </div>
        {user && (
          <Link to="/communities/create">
            <Button leftIcon={<HiOutlinePlus className="h-5 w-5" />}>Create community</Button>
          </Link>
        )}
      </header>

      <form className="card-surface space-y-4 p-5" onSubmit={apply}>
        <FormField
          label="Search"
          placeholder="Name, description, slug or interest"
          value={draft.q}
          onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
          leftIcon={<HiOutlineMagnifyingGlass className="h-5 w-5" />}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="community-category" className="block text-sm font-medium">
              Category
            </label>
            <select
              id="community-category"
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({ ...current, category: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">All categories</option>
              {COMMUNITY_CATEGORIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <FormField
            label="Interest"
            value={draft.interest}
            onChange={(event) =>
              setDraft((current) => ({ ...current, interest: event.target.value }))
            }
          />
          <div className="space-y-1.5">
            <label htmlFor="community-sort" className="block text-sm font-medium">
              Sort
            </label>
            <select
              id="community-sort"
              value={draft.sort}
              onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="newest">Newest</option>
              <option value="members">Most members</option>
            </select>
          </div>
        </div>
        <Button type="submit">Search</Button>
      </form>

      {user && (
        <p className="text-sm">
          <Link to="/communities/invitations" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
            View your invitations
          </Link>
        </p>
      )}

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      {status === 'loading' || status === 'idle' ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={HiOutlineUserGroup}
          title="No communities matched"
          description="Try a broader search, or create the group you wish existed."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((community) => (
              <li key={community.id}>
                <CommunityCard
                  community={community}
                  action={<JoinButton community={{ ...community, viewer: community.viewer ?? {} }} />}
                />
              </li>
            ))}
          </ul>
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default CommunitiesPage;
