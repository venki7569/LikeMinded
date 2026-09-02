import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { cn } from '@/utils/cn';
import Alert from '@/components/atoms/Alert';
import EmptyState from '@/components/molecules/EmptyState';
import Pagination from '@/components/molecules/Pagination';
import { PeopleListSkeleton } from '@/features/connections/components/PeopleList';
import ConnectionRequestCard from '@/features/connections/components/ConnectionRequestCard';
import {
  fetchIncoming,
  fetchOutgoing,
  selectIncoming,
  selectOutgoing,
} from '@/features/connections/connectionsSlice';

const TABS = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
];

export function RequestsPage() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('incoming');
  const [page, setPage] = useState(1);
  const incoming = useSelector(selectIncoming);
  const outgoing = useSelector(selectOutgoing);
  const list = tab === 'incoming' ? incoming : outgoing;

  useEffect(() => {
    const fetch = tab === 'incoming' ? fetchIncoming : fetchOutgoing;
    dispatch(fetch({ page, limit: 12 }));
  }, [dispatch, tab, page]);

  const refresh = () => {
    dispatch(fetchIncoming({ page: tab === 'incoming' ? page : 1, limit: 12 }));
    dispatch(fetchOutgoing({ page: tab === 'outgoing' ? page : 1, limit: 12 }));
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Accept people who reached out, or cancel requests you no longer want pending.
        </p>
      </header>

      <div role="tablist" className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              tab === item.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            )}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {list.status === 'failed' && <Alert tone="error">{list.error}</Alert>}
      {list.status === 'loading' || list.status === 'idle' ? (
        <PeopleListSkeleton />
      ) : list.items.length === 0 ? (
        <EmptyState
          title={tab === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}
          description={
            tab === 'incoming'
              ? 'When someone wants to connect, they will show up here.'
              : 'Requests you send will wait here until they are accepted or cancelled.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {list.items.map((request) => (
              <li key={request.id}>
                <ConnectionRequestCard request={request} direction={tab} onChanged={refresh} />
              </li>
            ))}
          </ul>
          <Pagination meta={list.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

export default RequestsPage;
