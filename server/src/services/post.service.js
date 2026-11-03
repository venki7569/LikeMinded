import mongoose from 'mongoose';
import { Post, default as PostModel } from '../models/post.model.js';
import { PostLike } from '../models/postLike.model.js';
import { Comment } from '../models/comment.model.js';
import { Block } from '../models/block.model.js';
import { Connection } from '../models/connection.model.js';
import CommunityMembership from '../models/communityMembership.model.js';
import Community from '../models/community.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { buildPaginationMeta } from '../utils/apiResponse.js';
import { CARD_SELECT, toPublicCard } from '../utils/publicCard.js';
import { assertHttpUrl, sanitizePlainText } from '../utils/sanitize.js';
import { POST_EVENTS, emitDomainEvent } from '../events/domainEvents.js';
import { POST_PRIVACY } from '../models/post.model.js';
import { checkToxicity } from '../utils/toxicityDetector.js';
import { analyzeSentiment } from '../utils/sentimentAnalyzer.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

async function findPostById(postId) {
  const post = await Post.findById(postId)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy');
  if (!post) throw ApiError.notFound('Post not found');
  return post;
}

async function getBlockedIds(userId) {
  if (!userId) return new Set();
  const blocks = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  }).lean();
  const ids = new Set();
  for (const b of blocks) {
    ids.add(String(b.blocker));
    ids.add(String(b.blocked));
  }
  // Remove self
  ids.delete(String(userId));
  return ids;
}

async function isConnected(userId, targetId) {
  if (!userId || !targetId) return false;
  const uStr = String(userId);
  const tStr = String(targetId);
  if (uStr === tStr) return true;
  const conn = await Connection.findOne({
    $or: [
      { userLow: userId, userHigh: targetId },
      { userLow: targetId, userHigh: userId },
    ],
    endedAt: null,
  });
  return !!conn;
}

/**
 * Returns true when viewerId may see this post.
 * Rules:
 *   private  → author only
 *   connections → author or accepted connection (neither party blocked)
 *   public   → anyone not blocked by author
 */
async function canViewPost(post, viewerId) {
  const authorId = String(post.author._id ?? post.author);

  if (post.privacy === POST_PRIVACY.PRIVATE) {
    return viewerId && String(viewerId) === authorId;
  }

  if (post.privacy === POST_PRIVACY.CONNECTIONS) {
    if (!viewerId) return false;
    const vStr = String(viewerId);
    if (vStr === authorId) return true;
    const blockedIds = await getBlockedIds(authorId);
    if (blockedIds.has(vStr)) return false;
    return isConnected(authorId, viewerId);
  }

  // public
  if (!viewerId) return true;
  const blockedIds = await getBlockedIds(authorId);
  return !blockedIds.has(String(viewerId));
}

function extractHashtags(content) {
  if (!content) return [];
  const matches = [...(content.matchAll(/#([a-z0-9_]+)/gi) ?? [])];
  const seen = new Set();
  const tags = [];
  for (const m of matches) {
    const tag = m[1].toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
    if (tags.length >= 30) break;
  }
  return tags;
}

async function extractMentions(content) {
  if (!content) return [];
  const matches = [...(content.matchAll(/@([a-z0-9_]+)/gi) ?? [])];
  const handles = [...new Set(matches.map((m) => m[1].toLowerCase()))].slice(0, 30);
  if (handles.length === 0) return [];
  const users = await User.find({ username: { $in: handles } })
    .select('_id')
    .lean();
  return users.map((u) => u._id);
}

function buildCommunityCard(community) {
  if (!community) return null;
  const json = typeof community.toJSON === 'function' ? community.toJSON() : community;
  return {
    id: json.id ?? json._id?.toString(),
    name: json.name,
    slug: json.slug,
    avatar: json.avatar ?? { url: '', publicId: '' },
  };
}

function buildPostDto(post, { viewerId, likedPostIds = new Set() } = {}) {
  const json = typeof post.toJSON === 'function' ? post.toJSON() : post;
  const postId = String(json.id ?? json._id);
  return {
    id: postId,
    author: toPublicCard(post.author),
    community: buildCommunityCard(post.community),
    content: json.content ?? '',
    media: json.media ?? [],
    privacy: json.privacy,
    hashtags: json.hashtags ?? [],
    mentions: (post.mentions ?? []).map((m) => toPublicCard(m)),
    likeCount: json.likeCount ?? 0,
    commentCount: json.commentCount ?? 0,
    isLiked: likedPostIds.has(postId),
    sentiment: json.sentiment ?? 'neutral',
    editedAt: json.editedAt ?? null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function buildCommentDto(comment, viewerId) {
  const json = typeof comment.toJSON === 'function' ? comment.toJSON() : comment;
  return {
    id: json.id ?? json._id?.toString(),
    author: toPublicCard(comment.author),
    content: json.content,
    editedAt: json.editedAt ?? null,
    isOwn: viewerId ? String(comment.author?._id ?? comment.author) === String(viewerId) : false,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function sanitizeMedia(mediaArr) {
  if (!mediaArr || mediaArr.length === 0) return [];
  return mediaArr.map((item, idx) => {
    try {
      const url = assertHttpUrl(item.url ?? '', { field: `media[${idx}].url` });
      return { url, publicId: item.publicId ?? '' };
    } catch (err) {
      throw ApiError.badRequest(err.message);
    }
  });
}

async function getLikedPostIds(viewerId, postIds) {
  if (!viewerId || postIds.length === 0) return new Set();
  const likes = await PostLike.find({
    user: viewerId,
    post: { $in: postIds },
  })
    .select('post')
    .lean();
  return new Set(likes.map((l) => String(l.post)));
}

// ---------------------------------------------------------------------------
// Exported service functions
// ---------------------------------------------------------------------------

export async function createPost(actorId, payload) {
  const { content: rawContent, media: rawMedia, privacy, communityId } = payload;

  const content = sanitizePlainText(rawContent ?? '', { maxLength: 5000 });
  const media = sanitizeMedia(rawMedia ?? []);

  if (content.trim().length === 0 && media.length === 0) {
    throw ApiError.badRequest('Post must have content or media');
  }

  if (content) {
    const toxicity = checkToxicity(content);
    if (toxicity.isToxic) {
      throw ApiError.badRequest(toxicity.reason);
    }
  }

  const { sentiment } = analyzeSentiment(content);
  const hashtags = extractHashtags(content);
  const mentions = await extractMentions(content);

  // Community membership check
  let resolvedCommunity = null;
  if (communityId) {
    const community = await Community.findById(communityId);
    if (!community) throw ApiError.notFound('Community not found');
    const membership = await CommunityMembership.findOne({
      community: communityId,
      user: actorId,
    });
    if (!membership) throw ApiError.forbidden('You must be a member to post in this community');
    resolvedCommunity = community._id;
  }

  const post = await Post.create({
    author: actorId,
    community: resolvedCommunity,
    content,
    media,
    privacy: privacy ?? POST_PRIVACY.PUBLIC,
    hashtags,
    mentions,
    sentiment,
  });

  const populated = await Post.findById(post._id)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  emitDomainEvent(POST_EVENTS.POST_CREATED, { postId: String(post._id), actorId });

  return buildPostDto(populated, { viewerId: actorId, likedPostIds: new Set() });
}

export async function getPost(postId, viewerId) {
  const post = await Post.findById(postId)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  if (!post) throw ApiError.notFound('Post not found');

  const visible = await canViewPost(post, viewerId);
  if (!visible) throw ApiError.notFound('Post not found');

  // For community posts, check community membership for private communities
  if (post.community && post.community.privacy === 'private') {
    if (!viewerId) throw ApiError.notFound('Post not found');
    const membership = await CommunityMembership.findOne({
      community: post.community._id,
      user: viewerId,
    });
    if (!membership) throw ApiError.notFound('Post not found');
  }

  const likedPostIds = await getLikedPostIds(viewerId, [String(post._id)]);
  return buildPostDto(post, { viewerId, likedPostIds });
}

export async function updatePost(postId, actorId, payload) {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');
  if (String(post.author) !== String(actorId)) {
    throw ApiError.forbidden('You can only edit your own posts');
  }

  const { content: rawContent, media: rawMedia, privacy } = payload;

  if (rawContent !== undefined) {
    post.content = sanitizePlainText(rawContent, { maxLength: 5000 });
    post.hashtags = extractHashtags(post.content);
    post.mentions = await extractMentions(post.content);
  }
  if (rawMedia !== undefined) {
    post.media = sanitizeMedia(rawMedia);
  }
  if (privacy !== undefined) {
    post.privacy = privacy;
  }

  post.editedAt = new Date();
  await post.save();

  const populated = await Post.findById(post._id)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  emitDomainEvent(POST_EVENTS.POST_UPDATED, { postId: String(post._id), actorId });

  const likedPostIds = await getLikedPostIds(actorId, [String(post._id)]);
  return buildPostDto(populated, { viewerId: actorId, likedPostIds });
}

export async function deletePost(postId, actorId, actorRole) {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = String(post.author) === String(actorId);
  const isAdmin = actorRole === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You can only delete your own posts');
  }

  await Promise.all([
    PostLike.deleteMany({ post: postId }),
    Comment.deleteMany({ post: postId }),
    Post.findByIdAndDelete(postId),
  ]);

  emitDomainEvent(POST_EVENTS.POST_DELETED, { postId, actorId });
  return { deleted: true };
}

export async function likePost(postId, actorId) {
  const post = await Post.findById(postId)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy');

  if (!post) throw ApiError.notFound('Post not found');

  const visible = await canViewPost(post, actorId);
  if (!visible) throw ApiError.notFound('Post not found');

  // Check for duplicate like
  const existing = await PostLike.findOne({ post: postId, user: actorId });
  if (existing) throw ApiError.conflict('You have already liked this post');

  await PostLike.create({ post: postId, user: actorId });
  const updated = await Post.findByIdAndUpdate(
    postId,
    { $inc: { likeCount: 1 } },
    { new: true }
  );

  emitDomainEvent(POST_EVENTS.POST_LIKED, { postId, actorId });
  return { liked: true, likeCount: updated.likeCount };
}

export async function unlikePost(postId, actorId) {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  const like = await PostLike.findOne({ post: postId, user: actorId });
  if (!like) throw ApiError.conflict('You have not liked this post');

  await PostLike.deleteOne({ _id: like._id });
  const newCount = Math.max(0, (post.likeCount ?? 0) - 1);
  const updated = await Post.findByIdAndUpdate(
    postId,
    { $set: { likeCount: newCount } },
    { new: true }
  );

  emitDomainEvent(POST_EVENTS.POST_UNLIKED, { postId, actorId });
  return { liked: false, likeCount: updated.likeCount };
}

export async function getHomeFeed(actorId, { cursor, limit = 20 } = {}) {
  // Find all active connections
  const connections = await Connection.find({
    $or: [{ userLow: actorId }, { userHigh: actorId }],
    endedAt: null,
  }).lean();

  const connectedIds = connections.map((c) =>
    String(c.userLow) === String(actorId) ? c.userHigh : c.userLow
  );

  const blockedIds = await getBlockedIds(actorId);
  const blockedArr = [...blockedIds];

  // Build feed query
  const authorIds = [actorId, ...connectedIds].filter((id) => !blockedIds.has(String(id)));

  const query = {
    author: { $in: authorIds },
    privacy: { $in: [POST_PRIVACY.PUBLIC, POST_PRIVACY.CONNECTIONS] },
  };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const fetchLimit = limit + 1;
  const posts = await Post.find(query)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  const postIds = page.map((p) => String(p._id));
  const likedPostIds = await getLikedPostIds(actorId, postIds);

  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return {
    posts: page.map((p) => buildPostDto(p, { viewerId: actorId, likedPostIds })),
    nextCursor,
    hasMore,
  };
}

export async function getProfileFeed(username, viewerId, { cursor, limit = 20 } = {}) {
  const user = await User.findOne({ username }).select('_id').lean();
  if (!user) throw ApiError.notFound('User not found');

  const targetId = user._id;
  const blockedIds = viewerId ? await getBlockedIds(viewerId) : new Set();
  if (viewerId && blockedIds.has(String(targetId))) {
    throw ApiError.notFound('User not found');
  }

  // Determine which privacy levels the viewer may see
  let allowedPrivacy;
  if (viewerId && String(viewerId) === String(targetId)) {
    allowedPrivacy = [POST_PRIVACY.PUBLIC, POST_PRIVACY.CONNECTIONS, POST_PRIVACY.PRIVATE];
  } else if (viewerId && (await isConnected(viewerId, targetId))) {
    allowedPrivacy = [POST_PRIVACY.PUBLIC, POST_PRIVACY.CONNECTIONS];
  } else {
    allowedPrivacy = [POST_PRIVACY.PUBLIC];
  }

  const query = {
    author: targetId,
    privacy: { $in: allowedPrivacy },
  };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const fetchLimit = limit + 1;
  const posts = await Post.find(query)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  const postIds = page.map((p) => String(p._id));
  const likedPostIds = viewerId ? await getLikedPostIds(viewerId, postIds) : new Set();

  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return {
    posts: page.map((p) => buildPostDto(p, { viewerId, likedPostIds })),
    nextCursor,
    hasMore,
  };
}

export async function getCommunityFeed(slug, viewerId, { cursor, limit = 20 } = {}) {
  const community = await Community.findOne({ slug });
  if (!community) throw ApiError.notFound('Community not found');

  // For private communities, require membership
  if (community.privacy === 'private') {
    if (!viewerId) throw ApiError.notFound('Community not found');
    const membership = await CommunityMembership.findOne({
      community: community._id,
      user: viewerId,
    });
    if (!membership) throw ApiError.notFound('Community not found');
  }

  const query = { community: community._id };

  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const fetchLimit = limit + 1;
  const posts = await Post.find(query)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy')
    .populate('mentions', CARD_SELECT);

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  const postIds = page.map((p) => String(p._id));
  const likedPostIds = viewerId ? await getLikedPostIds(viewerId, postIds) : new Set();

  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return {
    posts: page.map((p) => buildPostDto(p, { viewerId, likedPostIds })),
    nextCursor,
    hasMore,
  };
}

export async function createComment(postId, actorId, content) {
  const post = await Post.findById(postId)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy');
  if (!post) throw ApiError.notFound('Post not found');

  const visible = await canViewPost(post, actorId);
  if (!visible) throw ApiError.notFound('Post not found');

  const sanitized = sanitizePlainText(content, { maxLength: 2000 });
  if (!sanitized) throw ApiError.badRequest('Comment content is required');

  const toxicity = checkToxicity(sanitized);
  if (toxicity.isToxic) {
    throw ApiError.badRequest(toxicity.reason);
  }

  const comment = await Comment.create({
    post: postId,
    author: actorId,
    content: sanitized,
  });

  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

  const populated = await Comment.findById(comment._id).populate('author', CARD_SELECT);

  emitDomainEvent(POST_EVENTS.COMMENT_CREATED, { postId, commentId: String(comment._id), actorId });

  return buildCommentDto(populated, actorId);
}

export async function listComments(postId, viewerId, { page = 1, limit = 20 } = {}) {
  const post = await Post.findById(postId)
    .populate('author', CARD_SELECT)
    .populate('community', 'name slug avatar privacy');
  if (!post) throw ApiError.notFound('Post not found');

  const visible = await canViewPost(post, viewerId);
  if (!visible) throw ApiError.notFound('Post not found');

  const skip = (page - 1) * limit;
  const total = await Comment.countDocuments({ post: postId });

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('author', CARD_SELECT);

  const meta = buildPaginationMeta({ page, limit, total });

  return {
    comments: comments.map((c) => buildCommentDto(c, viewerId)),
    meta,
  };
}

export async function updateComment(postId, commentId, actorId, content) {
  const comment = await Comment.findOne({ _id: commentId, post: postId }).populate(
    'author',
    CARD_SELECT
  );
  if (!comment) throw ApiError.notFound('Comment not found');

  if (String(comment.author._id ?? comment.author) !== String(actorId)) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  const sanitized = sanitizePlainText(content, { maxLength: 2000 });
  if (!sanitized) throw ApiError.badRequest('Comment content is required');

  comment.content = sanitized;
  comment.editedAt = new Date();
  await comment.save();

  emitDomainEvent(POST_EVENTS.COMMENT_UPDATED, { postId, commentId, actorId });

  return buildCommentDto(comment, actorId);
}

export async function deleteComment(postId, commentId, actorId, actorRole) {
  const post = await Post.findById(postId);
  if (!post) throw ApiError.notFound('Post not found');

  const comment = await Comment.findOne({ _id: commentId, post: postId });
  if (!comment) throw ApiError.notFound('Comment not found');

  const isCommentAuthor = String(comment.author) === String(actorId);
  const isPostAuthor = String(post.author) === String(actorId);
  const isAdmin = actorRole === 'admin';

  if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
    throw ApiError.forbidden('You do not have permission to delete this comment');
  }

  await Comment.findByIdAndDelete(commentId);
  const newCount = Math.max(0, (post.commentCount ?? 0) - 1);
  await Post.findByIdAndUpdate(postId, { $set: { commentCount: newCount } });

  emitDomainEvent(POST_EVENTS.COMMENT_DELETED, { postId, commentId, actorId });
  return { deleted: true };
}
