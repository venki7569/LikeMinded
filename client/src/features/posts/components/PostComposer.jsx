import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HiOutlinePhoto,
  HiOutlineGlobeAmericas,
  HiOutlineUsers,
  HiOutlineLockClosed,
  HiOutlineXMark,
} from 'react-icons/hi2';
import Avatar from '@/components/atoms/Avatar';
import Button from '@/components/atoms/Button';
import Spinner from '@/components/atoms/Spinner';
import { createNewPost, selectPostCreation } from '../postSlice';
import { selectCurrentUser } from '@/features/auth/authSlice';
import { pushToast } from '@/features/ui/toastSlice';

export function PostComposer({ communityId = null, placeholder = "What's on your mind? Share skills, projects, or goals..." }) {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const { status } = useSelector(selectPostCreation);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaList, setMediaList] = useState([]);
  const [showMediaInput, setShowMediaInput] = useState(false);

  if (!currentUser) return null;

  const isSubmitting = status === 'loading';

  const handleAddMedia = () => {
    if (!mediaUrl.trim()) return;
    try {
      new URL(mediaUrl.trim());
      if (mediaList.length >= 10) {
        dispatch(pushToast({ message: 'Maximum 10 images per post', tone: 'error' }));
        return;
      }
      setMediaList([...mediaList, { url: mediaUrl.trim() }]);
      setMediaUrl('');
      setShowMediaInput(false);
    } catch {
      dispatch(pushToast({ message: 'Please enter a valid HTTP(S) image URL', tone: 'error' }));
    }
  };

  const handleRemoveMedia = (index) => {
    setMediaList(mediaList.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && mediaList.length === 0) {
      dispatch(pushToast({ message: 'Post cannot be empty', tone: 'error' }));
      return;
    }

    try {
      await dispatch(
        createNewPost({
          content: content.trim(),
          privacy,
          media: mediaList,
          communityId: communityId || undefined,
        })
      ).unwrap();

      setContent('');
      setMediaList([]);
      setShowMediaInput(false);
      dispatch(pushToast({ message: 'Post published!', tone: 'success' }));
    } catch (err) {
      dispatch(pushToast({ message: err?.message || 'Failed to create post', tone: 'error' }));
    }
  };

  return (
    <div className="card-surface p-5">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar
            name={currentUser.name}
            src={currentUser.avatar?.url}
            size="md"
            className="flex-shrink-0"
          />
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              maxLength={5000}
              className="w-full resize-none border-0 bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
            />

            {/* Media previews */}
            {mediaList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mediaList.map((media, index) => (
                  <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={media.url} alt="Attached preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-red-600 transition-colors"
                    >
                      <HiOutlineXMark className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Media URL Input row */}
            {showMediaInput && (
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="Paste image URL (https://...)"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
                <Button type="button" size="xs" variant="secondary" onClick={handleAddMedia}>
                  Attach
                </Button>
                <button
                  type="button"
                  onClick={() => setShowMediaInput(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMediaInput(!showMediaInput)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              <HiOutlinePhoto className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span>Add Image</span>
            </button>

            {/* Privacy Dropdown */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
              {privacy === 'public' && <HiOutlineGlobeAmericas className="h-3.5 w-3.5 text-slate-500" />}
              {privacy === 'connections' && <HiOutlineUsers className="h-3.5 w-3.5 text-slate-500" />}
              {privacy === 'private' && <HiOutlineLockClosed className="h-3.5 w-3.5 text-slate-500" />}
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="bg-transparent text-xs text-slate-600 focus:outline-none dark:text-slate-300"
              >
                <option value="public">Public</option>
                <option value="connections">Connections</option>
                <option value="private">Only Me</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className="text-[11px] text-slate-400">
                {5000 - content.length} left
              </span>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={(!content.trim() && mediaList.length === 0) || isSubmitting}
              leftIcon={isSubmitting ? <Spinner size="xs" /> : undefined}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default PostComposer;
