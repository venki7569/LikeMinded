import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Button from '@/components/atoms/Button';
import FormField from '@/components/molecules/FormField';
import Pagination from '@/components/molecules/Pagination';
import PeopleList, { PeopleListSkeleton } from '@/features/connections/components/PeopleList';
import ConnectionButton from '@/features/connections/components/ConnectionButton';
import UserCard from '@/features/connections/components/UserCard';
import {
  fetchBlocked,
  fetchConnections,
  selectBlocked,
  selectConnections,
  setConnectionQuery,
} from '@/features/connections/connectionsSlice';

export function ConnectionsPage() {
  const dispatch = useDispatch();
  const { items, meta, status, error, q } = useSelector(selectConnections);
  const blocked = useSelector(selectBlocked);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(q);

  useEffect(() => {
    dispatch(fetchConnections({ page, limit: 12, q }));
    dispatch(fetchBlocked({ page: 1, limit: 20 }));
  }, [dispatch, page, q]);

  const refresh = () => {
    dispatch(fetchConnections({ page, limit: 12, q }));
    dispatch(fetchBlocked({ page: 1, limit: 20 }));
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Connections</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          People you have already connected with. Remove or block from here if you need to.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          dispatch(setConnectionQuery(search.trim()));
        }}
      >
        <FormField
          className="flex-1"
          label="Search connections"
          placeholder="Name, username, or occupation"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leftIcon={<HiOutlineMagnifyingGlass className="h-5 w-5" />}
        />
        <Button type="submit" className="sm:mt-7">
          Search
        </Button>
      </form>

      {status === 'failed' && <Alert tone="error">{error}</Alert>}
      {status === 'loading' || status === 'idle' ? (
        <PeopleListSkeleton />
      ) : (
        <>
          <PeopleList
            items={items}
            emptyTitle="No connections yet"
            emptyDescription="Find people you may know and send a request to get started."
            onChanged={refresh}
          />
          <Pagination meta={meta} onPageChange={setPage} />
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Blocked</h2>
        {blocked.status === 'failed' && <Alert tone="error">{blocked.error}</Alert>}
        {blocked.items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">You have not blocked anyone.</p>
        ) : (
          <ul className="space-y-3">
            {blocked.items.map((item) => (
              <li key={item.user.id}>
                <UserCard
                  user={item.user}
                  relationshipStatus="blocked"
                  actions={
                    <div className="flex flex-col items-end gap-2">
                      <Link
                        to={`/u/${item.user.username}`}
                        className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline"
                      >
                        View profile
                      </Link>
                      <ConnectionButton
                        userId={item.user.id}
                        relationshipStatus="blocked"
                        onChanged={refresh}
                        compact
                      />
                    </div>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ConnectionsPage;
