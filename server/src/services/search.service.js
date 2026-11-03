import User from '../models/user.model.js';
import Community from '../models/community.model.js';
import Post from '../models/post.model.js';
import Event from '../models/event.model.js';
import { toPublicCard } from '../utils/publicCard.js';

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export async function searchAll(queryStr, { type = 'all', limit = 10 } = {}) {
  const q = (queryStr || '').trim();
  if (!q) {
    return { users: [], communities: [], posts: [], events: [], totalCount: 0 };
  }

  const safeRegex = new RegExp(escapeRegex(q), 'i');
  const numericLimit = Math.min(30, Math.max(1, parseInt(limit, 10) || 10));

  const shouldSearchUsers = type === 'all' || type === 'users';
  const shouldSearchCommunities = type === 'all' || type === 'communities';
  const shouldSearchPosts = type === 'all' || type === 'posts';
  const shouldSearchEvents = type === 'all' || type === 'events';

  const [users, communities, posts, events] = await Promise.all([
    shouldSearchUsers
      ? User.find({
          $or: [
            { name: safeRegex },
            { username: safeRegex },
            { bio: safeRegex },
            { skills: safeRegex },
            { interests: safeRegex },
            { occupation: safeRegex },
          ],
          isActive: true,
          isBanned: false,
        })
          .limit(numericLimit)
          .lean()
      : [],

    shouldSearchCommunities
      ? Community.find({
          $or: [
            { name: safeRegex },
            { slug: safeRegex },
            { description: safeRegex },
            { category: safeRegex },
            { interests: safeRegex },
          ],
          privacy: 'public',
        })
          .limit(numericLimit)
          .lean()
      : [],

    shouldSearchPosts
      ? Post.find({
          $or: [{ content: safeRegex }, { hashtags: safeRegex }],
          privacy: 'public',
        })
          .populate('author', 'name username avatar')
          .populate('community', 'name slug avatar')
          .limit(numericLimit)
          .lean()
      : [],

    shouldSearchEvents
      ? Event.find({
          $or: [
            { title: safeRegex },
            { description: safeRegex },
            { location: safeRegex },
            { category: safeRegex },
          ],
        })
          .populate('host', 'name username avatar')
          .limit(numericLimit)
          .lean()
      : [],
  ]);

  return {
    users: users.map(toPublicCard),
    communities,
    posts,
    events,
    totalCount: users.length + communities.length + posts.length + events.length,
  };
}

export default {
  searchAll,
};
