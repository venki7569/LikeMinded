import Spinner from '@/components/atoms/Spinner';
import Button from '@/components/atoms/Button';
import PostCard from './PostCard';
import { HiOutlineDocumentText } from 'react-icons/hi2';

export function FeedList({
  posts = [],
  status = 'idle',
  error = null,
  hasMore = false,
  onLoadMore = () => {},
  isLoadingMore = false,
  emptyMessage = "No posts yet. Connect with others, join communities, or share what you're working on!",
}) {
  if (status === 'loading' && posts.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-surface p-5 animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (status === 'failed' && posts.length === 0) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-sm text-red-500">{error || 'Failed to load posts'}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card-surface p-10 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <HiOutlineDocumentText className="h-6 w-6" />
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">No posts to display</h3>
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id || post._id} post={post} />
      ))}

      {hasMore && (
        <div className="pt-2 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            leftIcon={isLoadingMore ? <Spinner size="xs" /> : undefined}
          >
            {isLoadingMore ? 'Loading more...' : 'Load more posts'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default FeedList;
