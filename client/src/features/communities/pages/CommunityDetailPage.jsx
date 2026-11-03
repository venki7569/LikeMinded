import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { HiOutlineCog6Tooth, HiOutlineLockClosed, HiOutlineUsers } from 'react-icons/hi2';
import Alert from '@/components/atoms/Alert';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import { Skeleton, SkeletonText } from '@/components/atoms/Skeleton';
import EmptyState from '@/components/molecules/EmptyState';
import { Chip } from '@/features/profile/components/ProfileParts';
import { selectCurrentUser } from '@/features/auth/authSlice';
import JoinButton from '../components/JoinButton';
import { PrivacyBadge, MemberCount } from '../components/CommunityCard';
import { categoryLabel } from '../categories';
import PostComposer from '@/features/posts/components/PostComposer';
import FeedList from '@/features/posts/components/FeedList';
import { fetchCommunityFeed, selectFeed } from '@/features/posts/postSlice';
import {
  clearCurrentCommunity,
  fetchCommunity,
  fetchMembers,
  selectCommunityMembers,
  selectCurrentCommunity,
} from '../communitiesSlice';

function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading community">
      <Skeleton className="h-44 w-full" rounded="rounded-card" />
      <SkeletonText lines={4} />
    </div>
  );
}

export function CommunityDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const me = useSelector(selectCurrentUser);
  const { community, status, error } = useSelector(selectCurrentCommunity);
  const members = useSelector(selectCommunityMembers);
  const feed = useSelector(selectFeed);

  useEffect(() => {
    dispatch(fetchCommunity(slug));
    return () => dispatch(clearCurrentCommunity());
  }, [dispatch, slug]);

  useEffect(() => {
    if (community?.viewer?.isMember) {
      dispatch(fetchMembers({ slug, limit: 6 }));
    }
  }, [dispatch, slug, community?.viewer?.isMember]);

  useEffect(() => {
    if (community && (community.privacy !== 'private' || community.viewer?.isMember)) {
      dispatch(fetchCommunityFeed({ slug }));
    }
  }, [dispatch, slug, community]);

  if (status === 'loading' || status === 'idle') return <DetailSkeleton />;
  if (status === 'failed') {
    return <EmptyState title="Community not found" description={error} />;
  }
  if (!community) return <DetailSkeleton />;

  const isPrivate = community.privacy === 'private';
  const isMember = community.viewer?.isMember;
  const canManage = community.viewer?.canManageRequests || community.viewer?.canEdit;

  return (
    <article className="space-y-6">
      <div className="card-surface overflow-hidden">
        <div className="from-brand-600 relative h-44 bg-linear-to-r to-violet-500">
          {community.coverImage?.url && (
            <img src={community.coverImage.url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={community.name} src={community.avatar?.url} size="lg" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">{community.name}</h1>
                  <PrivacyBadge privacy={community.privacy} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {categoryLabel(community.category)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <JoinButton community={community} />
              {canManage && (
                <Link to={`/communities/${slug}/settings`}>
                  <Button variant="secondary" leftIcon={<HiOutlineCog6Tooth className="h-5 w-5" />}>
                    Settings
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <MemberCount count={community.memberCount} />
            {community.owner?.username && (
              <Link
                to={`/u/${community.owner.username}`}
                className="text-sm font-medium hover:underline"
              >
                Owner · {community.owner.displayName}
              </Link>
            )}
          </div>

          {community.description && (
            <p className="mt-4 max-w-3xl text-slate-700 dark:text-slate-200">{community.description}</p>
          )}
          {community.interests?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {community.interests.map((interest) => (
                <Chip key={interest}>{interest}</Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPrivate && !isMember && (
        <Alert tone="warning" title="This community is private">
          Member lists and future posts stay hidden until a moderator approves your request
          {me ? '' : '. Sign in to request access'}.
        </Alert>
      )}

      {isMember && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Members</h2>
            <Link
              to={`/communities/${slug}/members`}
              className="text-brand-600 dark:text-brand-400 text-sm font-semibold hover:underline"
            >
              View all
            </Link>
          </div>
          {members.status === 'failed' && <Alert tone="error">{members.error}</Alert>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {members.items.map((row) => (
              <li key={row.id} className="card-surface flex items-center gap-3 p-4">
                <Avatar name={row.user.displayName} src={row.user.profileImage?.url} size="sm" />
                <div>
                  <p className="font-semibold">{row.user.displayName}</p>
                  <p className="text-xs capitalize text-slate-500">{row.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {community.viewer?.canManageRequests && (
        <Link to={`/communities/${slug}/requests`}>
          <Button variant="secondary" leftIcon={<HiOutlineUsers className="h-5 w-5" />}>
            Join requests
          </Button>
        </Link>
      )}

      {(!isPrivate || isMember) && (
        <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Community Feed</h2>
            <span className="text-xs text-slate-400">Latest discussions & updates</span>
          </div>
          {isMember && (
            <PostComposer
              communityId={community.id || community._id}
              placeholder={`Share an update or question in ${community.name}...`}
            />
          )}
          <FeedList
            posts={feed.items}
            status={feed.status}
            error={feed.error}
            emptyMessage={`No posts yet in ${community.name}. Be the first to start a conversation!`}
          />
        </section>
      )}

      {isPrivate && !isMember && (
        <EmptyState
          icon={HiOutlineLockClosed}
          title="Members are hidden"
          description="Join requests keep this group closed until someone on the inside says yes."
        />
      )}
    </article>
  );
}

export default CommunityDetailPage;
