import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  HiHeart,
  HiOutlineHeart,
  HiOutlineChatBubbleLeft,
  HiOutlineTrash,
  HiOutlineGlobeAmericas,
  HiOutlineLockClosed,
  HiOutlineUsers,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import CommentSection from './CommentSection';
import { removePost, toggleLike } from '../postSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function PostCard({ post }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const postId = post.id || post._id;
  const author = post.author;
  const authorId = author?.id || author?._id;
  const isAuthor = currentUser && (currentUser.id === authorId || currentUser._id === authorId);
  const isLiked = post.isLiked ?? false;
  const likeCount = post.likeCount ?? 0;
  const commentCount = post.commentCount ?? 0;

  const handleLike = () => {
    if (!currentUser) {
      dispatch(pushToast({ message: 'Please sign in to like posts', tone: 'error' }));
      return;
    }
    dispatch(toggleLike({ postId, isLiked }));
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      await dispatch(removePost(postId)).unwrap();
      dispatch(pushToast({ message: 'Post deleted successfully', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to delete post', tone: 'error' }));
    } finally {
      setIsDeleting(false);
    }
  };

  const getPrivacyIcon = () => {
    if (post.privacy === 'private') {
      return <HiOutlineLockClosed className="h-3.5 w-3.5" title="Only you" />;
    }
    if (post.privacy === 'connections') {
      return <HiOutlineUsers className="h-3.5 w-3.5" title="Connections only" />;
    }
    return <HiOutlineGlobeAmericas className="h-3.5 w-3.5" title="Public" />;
  };

  // Render text with hashtags highlighted
  const renderFormattedContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const formattedDate = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <article className="card-surface p-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/u/${author?.username || ''}`}>
            <Avatar name={author?.name} src={author?.avatar?.url} size="md" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/u/${author?.username || ''}`}
                className="font-bold text-slate-900 hover:underline dark:text-slate-100"
              >
                {author?.name || 'Unknown User'}
              </Link>
              <span className="text-xs text-slate-400">@{author?.username}</span>

              {post.community && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  in{' '}
                  <Link
                    to={`/communities/${post.community.slug || post.community}`}
                    className="hover:underline text-brand-600 dark:text-brand-400"
                  >
                    {post.community.name || post.community.slug || 'Community'}
                  </Link>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <time dateTime={post.createdAt}>{formattedDate}</time>
              <span>•</span>
              <span className="inline-flex items-center gap-1">{getPrivacyIcon()}</span>
              {post.editedAt && <span>(edited)</span>}
            </div>
          </div>
        </div>

        {/* Post Actions (Delete for Author) */}
        {isAuthor && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Delete post"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Post Content */}
      <div className="mt-3.5 space-y-3">
        {post.content && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {renderFormattedContent(post.content)}
          </p>
        )}

        {/* Media Attachments */}
        {post.media && post.media.length > 0 && (
          <div
            className={`grid gap-2 rounded-2xl overflow-hidden mt-3 ${
              post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {post.media.map((item, idx) => (
              <img
                key={idx}
                src={item.url}
                alt={`Post media attachment ${idx + 1}`}
                className="w-full max-h-96 object-cover rounded-xl border border-slate-100 dark:border-slate-800"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Sentiment Badge if present */}
        {post.sentiment && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <HiOutlineSparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="capitalize font-medium text-slate-500 dark:text-slate-400">
              {post.sentiment} tone
            </span>
          </div>
        )}
      </div>

      {/* Interaction Footer */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors ${
            isLiked
              ? 'text-pink-600 bg-pink-50 dark:bg-pink-500/10'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {isLiked ? (
            <HiHeart className="h-5 w-5 text-pink-600" />
          ) : (
            <HiOutlineHeart className="h-5 w-5" />
          )}
          <span>{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <HiOutlineChatBubbleLeft className="h-5 w-5" />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Collapsible Comments Section */}
      {showComments && <CommentSection postId={postId} postAuthorId={authorId} />}
    </article>
  );
}

export default PostCard;
