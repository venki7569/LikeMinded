import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { HiOutlineTrash, HiOutlinePaperAirplane } from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import {
  createPostComment,
  fetchPostComments,
  removePostComment,
  selectCommentsForPost,
} from '../postSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function CommentSection({ postId, postAuthorId }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const comments = useSelector(selectCommentsForPost(postId));
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchPostComments({ postId })).finally(() => setLoading(false));
  }, [dispatch, postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await dispatch(createPostComment({ postId, content: content.trim() })).unwrap();
      setContent('');
      dispatch(pushToast({ message: 'Comment added', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to post comment', tone: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await dispatch(removePostComment({ postId, commentId })).unwrap();
      dispatch(pushToast({ message: 'Comment removed', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to remove comment', tone: 'error' }));
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      {currentUser && (
        <form onSubmit={handleSubmit} className="mb-4 flex items-center gap-2">
          <Avatar
            name={currentUser.name}
            src={currentUser.avatar?.url}
            size="xs"
            className="flex-shrink-0"
          />
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment..."
            maxLength={1000}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm transition-colors focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-850 dark:focus:bg-slate-900"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || submitting}
            leftIcon={submitting ? <Spinner size="xs" /> : <HiOutlinePaperAirplane className="h-4 w-4" />}
          >
            Reply
          </Button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" label="Loading comments" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-2 text-center text-xs text-slate-400">No comments yet. Be the first to reply!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const commentId = comment.id || comment._id;
            const author = comment.author;
            const isOwner = currentUser && (currentUser.id === author?.id || currentUser.id === author?._id);
            const isPostOwner = currentUser && (currentUser.id === postAuthorId);
            const canDelete = isOwner || isPostOwner;

            return (
              <div key={commentId} className="group flex items-start justify-between gap-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Link to={`/u/${author?.username || ''}`}>
                    <Avatar name={author?.name} src={author?.avatar?.url} size="xs" />
                  </Link>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/u/${author?.username || ''}`}
                        className="font-semibold text-slate-900 hover:underline dark:text-slate-100 text-xs"
                      >
                        {author?.name || 'User'}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-slate-700 dark:text-slate-200 text-xs">{comment.content}</p>
                  </div>
                </div>

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(commentId)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500"
                    title="Delete comment"
                  >
                    <HiOutlineTrash className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CommentSection;
