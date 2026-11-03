import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineUsers,
  HiOutlineUserGroup,
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
} from 'react-icons/hi2';
import searchApi from '../searchApi';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import EmptyState from '@/components/molecules/EmptyState';
import ConnectionButton from '@/features/connections/components/ConnectionButton';
import PostCard from '@/features/posts/components/PostCard';

const TABS = [
  { id: 'all', label: 'All Results' },
  { id: 'users', label: 'People' },
  { id: 'communities', label: 'Communities' },
  { id: 'posts', label: 'Posts' },
  { id: 'events', label: 'Events' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState(typeParam);
  const [results, setResults] = useState({ users: [], communities: [], posts: [], events: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!queryParam.trim()) {
      setResults({ users: [], communities: [], posts: [], events: [] });
      return;
    }

    setLoading(true);
    searchApi
      .search({ q: queryParam.trim(), type: activeTab, limit: 20 })
      .then((res) => {
        setResults(res.data?.data || { users: [], communities: [], posts: [], events: [] });
      })
      .catch(() => {
        setResults({ users: [], communities: [], posts: [], events: [] });
      })
      .finally(() => setLoading(false));
  }, [queryParam, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim(), type: activeTab });
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (query.trim()) {
      setSearchParams({ q: query.trim(), type: tabId });
    }
  };

  const hasAnyResults =
    (results.users?.length || 0) +
    (results.communities?.length || 0) +
    (results.posts?.length || 0) +
    (results.events?.length || 0) >
    0;

  return (
    <div className="space-y-6">
      {/* Search Bar Header */}
      <div className="card-surface p-6 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <HiOutlineMagnifyingGlass className="absolute left-4 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, communities, posts, skills, or events..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-base focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:focus:bg-slate-900 transition-colors"
          />
          <Button type="submit">Search</Button>
        </form>

        {/* Filter Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3 dark:border-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Searching platform..." />
        </div>
      ) : !queryParam ? (
        <EmptyState
          icon={HiOutlineMagnifyingGlass}
          title="Universal Search"
          description="Type keywords to discover connections, topics, discussions, and upcoming events."
        />
      ) : !hasAnyResults ? (
        <EmptyState
          icon={HiOutlineMagnifyingGlass}
          title={`No results found for "${queryParam}"`}
          description="Try different keywords, hashtags, or check your spelling."
        />
      ) : (
        <div className="space-y-8">
          {/* People Section */}
          {(activeTab === 'all' || activeTab === 'users') && results.users?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <HiOutlineUsers className="h-4 w-4 text-brand-600" />
                <span>People ({results.users.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.users.map((u) => {
                  const uid = u.id || u._id;
                  return (
                    <div key={uid} className="card-surface p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/u/${u.username}`}>
                          <Avatar name={u.displayName || u.name} src={u.profileImage?.url} size="md" />
                        </Link>
                        <div>
                          <Link to={`/u/${u.username}`} className="font-bold text-sm hover:underline">
                            {u.displayName || u.name}
                          </Link>
                          <p className="text-xs text-slate-400">@{u.username}</p>
                          {u.occupation && <p className="text-xs text-slate-500 mt-0.5">{u.occupation}</p>}
                        </div>
                      </div>
                      <ConnectionButton userId={uid} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Communities Section */}
          {(activeTab === 'all' || activeTab === 'communities') && results.communities?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <HiOutlineUserGroup className="h-4 w-4 text-indigo-600" />
                <span>Communities ({results.communities.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.communities.map((c) => {
                  const cid = c.id || c._id;
                  return (
                    <div key={cid} className="card-surface p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} src={c.avatar?.url} size="md" />
                        <div>
                          <Link to={`/communities/${c.slug}`} className="font-bold text-sm hover:underline">
                            {c.name}
                          </Link>
                          <p className="text-xs text-slate-400 capitalize">{c.category} · {c.memberCount || 0} members</p>
                        </div>
                      </div>
                      <Link to={`/communities/${c.slug}`}>
                        <Button variant="secondary" size="xs">View</Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Events Section */}
          {(activeTab === 'all' || activeTab === 'events') && results.events?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <HiOutlineCalendarDays className="h-4 w-4 text-purple-600" />
                <span>Events ({results.events.length})</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {results.events.map((ev) => (
                  <div key={ev.id || ev._id} className="card-surface p-4">
                    <span className="text-[10px] font-bold uppercase rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 px-2 py-0.5">
                      {ev.category}
                    </span>
                    <h4 className="font-bold text-sm mt-1">{ev.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(ev.startsAt).toLocaleDateString()} · {ev.location}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <HiOutlineDocumentText className="h-4 w-4 text-emerald-600" />
                <span>Posts ({results.posts.length})</span>
              </div>
              <div className="space-y-4">
                {results.posts.map((post) => (
                  <PostCard key={post.id || post._id} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
