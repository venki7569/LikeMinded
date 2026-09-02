import Community, {
  COMMUNITY_CATEGORIES,
  COMMUNITY_LIMITS,
  COMMUNITY_PRIVACY,
  RESERVED_COMMUNITY_SLUGS,
} from '../models/community.model.js';
import CommunityMembership from '../models/communityMembership.model.js';
import CommunityJoinRequest, { JOIN_REQUEST_STATUS } from '../models/communityJoinRequest.model.js';
import CommunityInvitation, { INVITATION_STATUS } from '../models/communityInvitation.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { buildPaginationMeta } from '../utils/apiResponse.js';
import { CARD_SELECT, toPublicCard } from '../utils/publicCard.js';
import { assertHttpUrl, sanitizePlainText, uniqueNormalizedTags } from '../utils/sanitize.js';
import {
  COMMUNITY_ACTIONS,
  MEMBER_ROLES,
  assertCan,
  can,
  canRemoveMember,
} from '../utils/communityPermissions.js';
import { runInTransaction, sessionOptions } from '../utils/transaction.js';
import { COMMUNITY_EVENTS, emitDomainEvent } from '../events/domainEvents.js';

function isDuplicateKey(error) {
  return error?.code === 11000;
}

function asMedia(input, field) {
  if (input == null) return { url: '', publicId: '' };
  try {
    const url = assertHttpUrl(input.url ?? '', { field });
    return { url, publicId: url ? (input.publicId ?? '') : '' };
  } catch (error) {
    throw ApiError.badRequest(error.message);
  }
}

export function slugify(name) {
  const slug = sanitizePlainText(name, { maxLength: COMMUNITY_LIMITS.slug })
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, COMMUNITY_LIMITS.slug);
  return slug;
}

async function uniqueSlug(base, session) {
  let candidate = base || 'community';
  if (RESERVED_COMMUNITY_SLUGS.has(candidate)) candidate = `${candidate}-group`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`.slice(0, COMMUNITY_LIMITS.slug);
    if (RESERVED_COMMUNITY_SLUGS.has(slug)) continue;
    const exists = await Community.exists({ slug }).session(session ?? null);
    if (!exists) return slug;
  }
  return `${candidate}-${Date.now().toString(36)}`.slice(0, COMMUNITY_LIMITS.slug);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findCommunityBySlug(slug) {
  const community = await Community.findOne({ slug });
  if (!community) throw ApiError.notFound('Community not found');
  return community;
}

async function getMembership(communityId, userId) {
  if (!userId) return null;
  return CommunityMembership.findOne({ community: communityId, user: userId });
}

async function requireMembership(communityId, userId) {
  const membership = await getMembership(communityId, userId);
  if (!membership) throw ApiError.forbidden('You are not a member of this community');
  return membership;
}

async function findActiveUser(userId) {
  const user = await User.findOne({ _id: userId, isActive: true, isBanned: false }).select(CARD_SELECT);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

async function bumpMemberCount(communityId, delta, session) {
  await Community.updateOne(
    { _id: communityId },
    { $inc: { memberCount: delta } },
    sessionOptions(session)
  );
}

async function recountMembers(communityId, session) {
  const count = await CommunityMembership.countDocuments({ community: communityId }).session(
    session ?? null
  );
  await Community.updateOne({ _id: communityId }, { $set: { memberCount: count } }, sessionOptions(session));
  return count;
}

async function addMember({ communityId, userId, role }, session) {
  try {
    const docs = [{ community: communityId, user: userId, role, joinedAt: new Date() }];
    const created = session
      ? await CommunityMembership.create(docs, { session })
      : await CommunityMembership.create(docs);
    const membership = Array.isArray(created) ? created[0] : created;
    await bumpMemberCount(communityId, 1, session);
    return membership;
  } catch (error) {
    if (isDuplicateKey(error)) throw ApiError.conflict('You are already a member of this community');
    throw error;
  }
}

async function cancelPendingJoin(communityId, userId, session) {
  await CommunityJoinRequest.updateMany(
    { community: communityId, user: userId, status: JOIN_REQUEST_STATUS.PENDING },
    { status: JOIN_REQUEST_STATUS.CANCELLED, reviewedAt: new Date() },
    sessionOptions(session)
  );
}

async function cancelPendingInvite(communityId, userId, session) {
  await CommunityInvitation.updateMany(
    { community: communityId, invitee: userId, status: INVITATION_STATUS.PENDING },
    { status: INVITATION_STATUS.CANCELLED, respondedAt: new Date() },
    sessionOptions(session)
  );
}

function toCommunityDto(community, { membership = null, joinRequest = null, invitation = null, owner = null } = {}) {
  const json = typeof community.toJSON === 'function' ? community.toJSON() : community;
  const role = membership?.role ?? null;
  return {
    id: json.id ?? json._id?.toString(),
    name: json.name,
    slug: json.slug,
    description: json.description,
    category: json.category,
    interests: json.interests ?? [],
    avatar: json.avatar ?? { url: '', publicId: '' },
    coverImage: json.coverImage ?? { url: '', publicId: '' },
    privacy: json.privacy,
    memberCount: json.memberCount ?? 0,
    owner: owner ? toPublicCard(owner) : { id: String(json.owner) },
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
    viewer: {
      isMember: Boolean(membership),
      role,
      joinRequestId: joinRequest?.id ?? joinRequest?._id?.toString() ?? null,
      invitationId: invitation?.id ?? invitation?._id?.toString() ?? null,
      canEdit: can(role, COMMUNITY_ACTIONS.EDIT),
      canManageMembers: can(role, COMMUNITY_ACTIONS.REMOVE_MEMBER),
      canManageRequests: can(role, COMMUNITY_ACTIONS.MANAGE_REQUESTS),
      canInvite: can(role, COMMUNITY_ACTIONS.INVITE),
      canDelete: can(role, COMMUNITY_ACTIONS.DELETE),
      canTransfer: can(role, COMMUNITY_ACTIONS.TRANSFER),
    },
  };
}

function toCard(community) {
  const json = typeof community.toJSON === 'function' ? community.toJSON() : community;
  return {
    id: json.id ?? json._id?.toString(),
    name: json.name,
    slug: json.slug,
    description: json.description,
    category: json.category,
    interests: json.interests ?? [],
    avatar: json.avatar ?? { url: '', publicId: '' },
    coverImage: json.coverImage ?? { url: '', publicId: '' },
    privacy: json.privacy,
    memberCount: json.memberCount ?? 0,
  };
}

export async function createCommunity(actorId, payload) {
  const name = sanitizePlainText(payload.name, { maxLength: COMMUNITY_LIMITS.name });
  if (name.length < 2) throw ApiError.badRequest('Community name must be at least 2 characters');

  const description = sanitizePlainText(payload.description ?? '', {
    maxLength: COMMUNITY_LIMITS.description,
  });
  const category = payload.category ?? 'other';
  if (!COMMUNITY_CATEGORIES.includes(category)) {
    throw ApiError.badRequest('Invalid category');
  }
  const interests = uniqueNormalizedTags(payload.interests, {
    maxItems: COMMUNITY_LIMITS.interests,
    maxLength: COMMUNITY_LIMITS.interestLength,
  });
  const privacy = payload.privacy ?? COMMUNITY_PRIVACY.PUBLIC;
  const avatar = asMedia(payload.avatar, 'avatar URL');
  const coverImage = asMedia(payload.coverImage, 'cover image URL');

  const community = await runInTransaction(async (session) => {
    const slug = await uniqueSlug(slugify(name), session);
    const payload = {
      name,
      slug,
      description,
      category,
      interests,
      privacy,
      avatar,
      coverImage,
      owner: actorId,
      memberCount: 1,
    };
    const created = session
      ? await Community.create([payload], { session })
      : await Community.create([payload]);
    const doc = created[0];
    const membershipDocs = [
      { community: doc._id, user: actorId, role: MEMBER_ROLES.OWNER, joinedAt: new Date() },
    ];
    if (session) {
      await CommunityMembership.create(membershipDocs, { session });
    } else {
      await CommunityMembership.create(membershipDocs);
    }
    return doc;
  });

  emitDomainEvent(COMMUNITY_EVENTS.CREATED, {
    communityId: community.id,
    actorId: String(actorId),
    slug: community.slug,
  });

  const owner = await User.findById(actorId).select(CARD_SELECT);
  const membership = await getMembership(community._id, actorId);
  return toCommunityDto(community, { membership, owner });
}

export async function getCommunityBySlug(slug, viewerId) {
  const community = await findCommunityBySlug(slug);
  const [membership, owner, joinRequest, invitation] = await Promise.all([
    getMembership(community._id, viewerId),
    User.findById(community.owner).select(CARD_SELECT),
    viewerId
      ? CommunityJoinRequest.findOne({
          community: community._id,
          user: viewerId,
          status: JOIN_REQUEST_STATUS.PENDING,
        })
      : null,
    viewerId
      ? CommunityInvitation.findOne({
          community: community._id,
          invitee: viewerId,
          status: INVITATION_STATUS.PENDING,
        })
      : null,
  ]);

  const isPrivate = community.privacy === COMMUNITY_PRIVACY.PRIVATE;
  if (isPrivate && !membership) {
    return toCommunityDto(community, { membership: null, joinRequest, invitation, owner: null });
  }

  return toCommunityDto(community, { membership, joinRequest, invitation, owner });
}

export async function updateCommunity(slug, actorId, payload) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);

  if (payload.privacy != null && payload.privacy !== community.privacy) {
    assertCan(membership.role, COMMUNITY_ACTIONS.EDIT_PRIVACY, 'Only the owner can change privacy');
  } else {
    assertCan(membership.role, COMMUNITY_ACTIONS.EDIT);
  }

  if (payload.name != null) {
    const name = sanitizePlainText(payload.name, { maxLength: COMMUNITY_LIMITS.name });
    if (name.length < 2) throw ApiError.badRequest('Community name must be at least 2 characters');
    community.name = name;
  }
  if (payload.description != null) {
    community.description = sanitizePlainText(payload.description, {
      maxLength: COMMUNITY_LIMITS.description,
    });
  }
  if (payload.category != null) {
    if (!COMMUNITY_CATEGORIES.includes(payload.category)) {
      throw ApiError.badRequest('Invalid category');
    }
    community.category = payload.category;
  }
  if (payload.interests) {
    community.interests = uniqueNormalizedTags(payload.interests, {
      maxItems: COMMUNITY_LIMITS.interests,
      maxLength: COMMUNITY_LIMITS.interestLength,
    });
  }
  if (payload.privacy != null) community.privacy = payload.privacy;
  if (payload.avatar) community.avatar = asMedia(payload.avatar, 'avatar URL');
  if (payload.coverImage) community.coverImage = asMedia(payload.coverImage, 'cover image URL');

  await community.save();
  emitDomainEvent(COMMUNITY_EVENTS.UPDATED, {
    communityId: community.id,
    actorId: String(actorId),
  });
  return getCommunityBySlug(community.slug, actorId);
}

export async function deleteCommunity(slug, actorId) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);
  assertCan(membership.role, COMMUNITY_ACTIONS.DELETE, 'Only the owner can delete this community');

  await runInTransaction(async (session) => {
    const filter = { community: community._id };
    await CommunityMembership.deleteMany(filter, sessionOptions(session));
    await CommunityJoinRequest.deleteMany(filter, sessionOptions(session));
    await CommunityInvitation.deleteMany(filter, sessionOptions(session));
    await Community.deleteOne({ _id: community._id }, sessionOptions(session));
  });

  emitDomainEvent(COMMUNITY_EVENTS.DELETED, {
    communityId: community.id,
    actorId: String(actorId),
    slug: community.slug,
  });
  return { deleted: true, slug: community.slug };
}

export async function listCommunities(viewerId, query) {
  const { q, category, interest, interests, privacy, sort, mine, page, limit } = query;
  const clauses = [];

  if (mine) {
    if (!viewerId) throw ApiError.unauthorized('Authentication required');
    const mineIds = await CommunityMembership.find({ user: viewerId }).distinct('community');
    clauses.push({ _id: { $in: mineIds } });
  } else {
    const visibility = [{ privacy: COMMUNITY_PRIVACY.PUBLIC }];
    if (viewerId) {
      const memberOf = await CommunityMembership.find({ user: viewerId }).distinct('community');
      if (memberOf.length) visibility.push({ _id: { $in: memberOf } });
    }
    clauses.push({ $or: visibility });
  }

  if (privacy && Object.values(COMMUNITY_PRIVACY).includes(privacy)) {
    clauses.push({ privacy });
  }
  if (category) clauses.push({ category });

  const interestTags = [
    ...(interest ? [interest] : []),
    ...(interests ? String(interests).split(',') : []),
  ]
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2);
  if (interestTags.length) clauses.push({ interests: { $all: interestTags } });

  const needle = q?.trim();
  if (needle) {
    const pattern = escapeRegex(needle);
    clauses.push({
      $or: [
        { name: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
        { slug: { $regex: pattern, $options: 'i' } },
        { category: { $regex: pattern, $options: 'i' } },
        { interests: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };
  const sortSpec =
    sort === 'members' ? { memberCount: -1, createdAt: -1 } : { createdAt: -1 };

  const [total, rows] = await Promise.all([
    Community.countDocuments(filter),
    Community.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    communities: rows.map((row) => toCard(row)),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function joinCommunity(slug, actorId) {
  const community = await findCommunityBySlug(slug);
  const existing = await getMembership(community._id, actorId);
  if (existing) throw ApiError.conflict('You are already a member of this community');

  const pendingInvite = await CommunityInvitation.findOne({
    community: community._id,
    invitee: actorId,
    status: INVITATION_STATUS.PENDING,
  });
  if (pendingInvite) {
    return acceptInvitation(pendingInvite.id, actorId);
  }

  if (community.privacy === COMMUNITY_PRIVACY.PRIVATE) {
    const pending = await CommunityJoinRequest.findOne({
      community: community._id,
      user: actorId,
      status: JOIN_REQUEST_STATUS.PENDING,
    });
    if (pending) throw ApiError.conflict('A join request is already pending');

    try {
      const request = await CommunityJoinRequest.create({
        community: community._id,
        user: actorId,
        status: JOIN_REQUEST_STATUS.PENDING,
      });
      emitDomainEvent(COMMUNITY_EVENTS.JOIN_REQUEST_CREATED, {
        communityId: community.id,
        actorId: String(actorId),
        requestId: request.id,
      });
      return {
        state: 'pending_request',
        request: { id: request.id, status: request.status },
        community: await getCommunityBySlug(slug, actorId),
      };
    } catch (error) {
      if (isDuplicateKey(error)) throw ApiError.conflict('A join request is already pending');
      throw error;
    }
  }

  await runInTransaction(async (session) => {
    await addMember({ communityId: community._id, userId: actorId, role: MEMBER_ROLES.MEMBER }, session);
    await cancelPendingJoin(community._id, actorId, session);
    await cancelPendingInvite(community._id, actorId, session);
  });

  emitDomainEvent(COMMUNITY_EVENTS.MEMBER_JOINED, {
    communityId: community.id,
    actorId: String(actorId),
  });

  return {
    state: 'joined',
    community: await getCommunityBySlug(slug, actorId),
  };
}

export async function leaveCommunity(slug, actorId) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);
  if (membership.role === MEMBER_ROLES.OWNER) {
    throw ApiError.badRequest('Transfer ownership before leaving this community');
  }

  await runInTransaction(async (session) => {
    await CommunityMembership.deleteOne({ _id: membership._id }, sessionOptions(session));
    await bumpMemberCount(community._id, -1, session);
  });

  emitDomainEvent(COMMUNITY_EVENTS.MEMBER_LEFT, {
    communityId: community.id,
    actorId: String(actorId),
  });

  return { left: true, community: await getCommunityBySlug(slug, actorId) };
}

export async function listJoinRequests(slug, actorId, query) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);
  assertCan(membership.role, COMMUNITY_ACTIONS.MANAGE_REQUESTS);

  const { page, limit, status } = query;
  const filter = { community: community._id };
  if (status) filter.status = status;

  const [total, rows] = await Promise.all([
    CommunityJoinRequest.countDocuments(filter),
    CommunityJoinRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'user', select: CARD_SELECT }),
  ]);

  return {
    requests: rows
      .filter((row) => row.user)
      .map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt ?? null,
        user: toPublicCard(row.user),
      })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

async function loadJoinRequest(community, requestId) {
  const request = await CommunityJoinRequest.findById(requestId);
  if (!request || String(request.community) !== String(community._id)) {
    throw ApiError.notFound('Join request not found');
  }
  return request;
}

export async function approveJoinRequest(slug, actorId, requestId) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);
  assertCan(membership.role, COMMUNITY_ACTIONS.MANAGE_REQUESTS);

  const request = await loadJoinRequest(community, requestId);
  if (request.status !== JOIN_REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }

  const already = await getMembership(community._id, request.user);
  if (already) {
    request.status = JOIN_REQUEST_STATUS.APPROVED;
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    await request.save();
    return { request, community: await getCommunityBySlug(slug, actorId) };
  }

  await runInTransaction(async (session) => {
    request.status = JOIN_REQUEST_STATUS.APPROVED;
    request.reviewedBy = actorId;
    request.reviewedAt = new Date();
    await request.save(sessionOptions(session));
    await addMember(
      { communityId: community._id, userId: request.user, role: MEMBER_ROLES.MEMBER },
      session
    );
    await cancelPendingInvite(community._id, request.user, session);
  });

  emitDomainEvent(COMMUNITY_EVENTS.JOIN_REQUEST_APPROVED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(request.user),
  });
  emitDomainEvent(COMMUNITY_EVENTS.MEMBER_JOINED, {
    communityId: community.id,
    actorId: String(request.user),
  });

  return { approved: true, community: await getCommunityBySlug(slug, actorId) };
}

export async function rejectJoinRequest(slug, actorId, requestId) {
  const community = await findCommunityBySlug(slug);
  const membership = await requireMembership(community._id, actorId);
  assertCan(membership.role, COMMUNITY_ACTIONS.MANAGE_REQUESTS);

  const request = await loadJoinRequest(community, requestId);
  if (request.status !== JOIN_REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }
  request.status = JOIN_REQUEST_STATUS.REJECTED;
  request.reviewedBy = actorId;
  request.reviewedAt = new Date();
  await request.save();

  emitDomainEvent(COMMUNITY_EVENTS.JOIN_REQUEST_REJECTED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(request.user),
  });
  return { rejected: true };
}

export async function cancelJoinRequest(slug, actorId, requestId) {
  const community = await findCommunityBySlug(slug);
  const request = await loadJoinRequest(community, requestId);
  if (String(request.user) !== String(actorId)) {
    throw ApiError.forbidden('You can only cancel your own join request');
  }
  if (request.status !== JOIN_REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }
  request.status = JOIN_REQUEST_STATUS.CANCELLED;
  request.reviewedAt = new Date();
  await request.save();

  emitDomainEvent(COMMUNITY_EVENTS.JOIN_REQUEST_CANCELLED, {
    communityId: community.id,
    actorId: String(actorId),
  });
  return { cancelled: true, community: await getCommunityBySlug(slug, actorId) };
}

export async function listMembers(slug, actorId, query) {
  const community = await findCommunityBySlug(slug);
  const membership = await getMembership(community._id, actorId);
  const isPrivate = community.privacy === COMMUNITY_PRIVACY.PRIVATE;
  if (!actorId) throw ApiError.unauthorized('Authentication required');
  if (isPrivate && !membership) {
    throw ApiError.forbidden('Only members can view this member list');
  }
  if (membership) assertCan(membership.role, COMMUNITY_ACTIONS.VIEW_MEMBERS);

  const { page, limit, q, role, sort } = query;
  const filter = { community: community._id };
  if (role && Object.values(MEMBER_ROLES).includes(role)) filter.role = role;

  if (q?.trim()) {
    const pattern = escapeRegex(q.trim());
    const users = await User.find({
      $or: [{ name: { $regex: pattern, $options: 'i' } }, { username: { $regex: pattern, $options: 'i' } }],
    })
      .select('_id')
      .lean();
    filter.user = { $in: users.map((user) => user._id) };
  }

  const sortSpec = sort === 'role' ? { role: 1, joinedAt: -1 } : { joinedAt: -1 };

  const [total, rows] = await Promise.all([
    CommunityMembership.countDocuments(filter),
    CommunityMembership.find(filter)
      .sort(sortSpec)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'user', select: CARD_SELECT }),
  ]);

  return {
    members: rows
      .filter((row) => row.user)
      .map((row) => ({
        id: row.id,
        role: row.role,
        joinedAt: row.joinedAt,
        user: toPublicCard(row.user),
      })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function removeMember(slug, actorId, targetId) {
  const community = await findCommunityBySlug(slug);
  const actor = await requireMembership(community._id, actorId);
  const target = await getMembership(community._id, targetId);
  if (!target) throw ApiError.notFound('That user is not a member of this community');
  if (String(actorId) === String(targetId)) {
    throw ApiError.badRequest('Leave the community instead of removing yourself');
  }
  if (!canRemoveMember(actor.role, target.role)) {
    throw ApiError.forbidden('You cannot remove this member');
  }

  await runInTransaction(async (session) => {
    await CommunityMembership.deleteOne({ _id: target._id }, sessionOptions(session));
    await bumpMemberCount(community._id, -1, session);
  });

  emitDomainEvent(COMMUNITY_EVENTS.MEMBER_REMOVED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(targetId),
  });
  return { removed: true };
}

export async function promoteModerator(slug, actorId, targetId) {
  const community = await findCommunityBySlug(slug);
  const actor = await requireMembership(community._id, actorId);
  assertCan(actor.role, COMMUNITY_ACTIONS.PROMOTE_MODERATOR, 'Only the owner can manage moderators');

  const target = await getMembership(community._id, targetId);
  if (!target) throw ApiError.notFound('That user is not a member of this community');
  if (target.role === MEMBER_ROLES.OWNER) {
    throw ApiError.badRequest('The owner cannot be changed through moderator APIs');
  }
  if (target.role === MEMBER_ROLES.MODERATOR) {
    throw ApiError.conflict('That member is already a moderator');
  }

  target.role = MEMBER_ROLES.MODERATOR;
  await target.save();

  emitDomainEvent(COMMUNITY_EVENTS.MODERATOR_PROMOTED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(targetId),
  });
  return { role: target.role };
}

export async function demoteModerator(slug, actorId, targetId) {
  const community = await findCommunityBySlug(slug);
  const actor = await requireMembership(community._id, actorId);
  assertCan(actor.role, COMMUNITY_ACTIONS.DEMOTE_MODERATOR, 'Only the owner can manage moderators');

  const target = await getMembership(community._id, targetId);
  if (!target) throw ApiError.notFound('That user is not a member of this community');
  if (target.role === MEMBER_ROLES.OWNER) {
    throw ApiError.badRequest('The owner cannot be changed through moderator APIs');
  }
  if (target.role !== MEMBER_ROLES.MODERATOR) {
    throw ApiError.badRequest('That member is not a moderator');
  }

  target.role = MEMBER_ROLES.MEMBER;
  await target.save();

  emitDomainEvent(COMMUNITY_EVENTS.MODERATOR_DEMOTED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(targetId),
  });
  return { role: target.role };
}

export async function transferOwnership(slug, actorId, targetId) {
  if (String(actorId) === String(targetId)) {
    throw ApiError.badRequest('You already own this community');
  }
  const community = await findCommunityBySlug(slug);
  const actor = await requireMembership(community._id, actorId);
  assertCan(actor.role, COMMUNITY_ACTIONS.TRANSFER, 'Only the owner can transfer ownership');

  const target = await getMembership(community._id, targetId);
  if (!target) throw ApiError.badRequest('The new owner must already be a member');

  await runInTransaction(async (session) => {
    actor.role = MEMBER_ROLES.MODERATOR;
    target.role = MEMBER_ROLES.OWNER;
    community.owner = target.user;
    await actor.save(sessionOptions(session));
    await target.save(sessionOptions(session));
    await community.save(sessionOptions(session));
  });

  emitDomainEvent(COMMUNITY_EVENTS.OWNERSHIP_TRANSFERRED, {
    communityId: community.id,
    actorId: String(actorId),
    userId: String(targetId),
  });
  return getCommunityBySlug(slug, actorId);
}

export async function createInvitation(slug, actorId, inviteeId) {
  if (String(actorId) === String(inviteeId)) {
    throw ApiError.badRequest('You cannot invite yourself');
  }
  const community = await findCommunityBySlug(slug);
  const actor = await requireMembership(community._id, actorId);
  assertCan(actor.role, COMMUNITY_ACTIONS.INVITE);
  await findActiveUser(inviteeId);

  const existing = await getMembership(community._id, inviteeId);
  if (existing) throw ApiError.conflict('That user is already a member');

  const pending = await CommunityInvitation.findOne({
    community: community._id,
    invitee: inviteeId,
    status: INVITATION_STATUS.PENDING,
  });
  if (pending) throw ApiError.conflict('An invitation is already pending');

  try {
    const invitation = await CommunityInvitation.create({
      community: community._id,
      inviter: actorId,
      invitee: inviteeId,
      status: INVITATION_STATUS.PENDING,
    });
    emitDomainEvent(COMMUNITY_EVENTS.INVITATION_CREATED, {
      communityId: community.id,
      actorId: String(actorId),
      userId: String(inviteeId),
    });
    return { invitation: { id: invitation.id, status: invitation.status } };
  } catch (error) {
    if (isDuplicateKey(error)) throw ApiError.conflict('An invitation is already pending');
    throw error;
  }
}

export async function listMyInvitations(actorId, query) {
  const { page, limit } = query;
  const filter = { invitee: actorId, status: INVITATION_STATUS.PENDING };
  const [total, rows] = await Promise.all([
    CommunityInvitation.countDocuments(filter),
    CommunityInvitation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'community' })
      .populate({ path: 'inviter', select: CARD_SELECT }),
  ]);

  return {
    invitations: rows
      .filter((row) => row.community)
      .map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        community: toCard(row.community),
        inviter: toPublicCard(row.inviter),
      })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

async function loadInvitationForInvitee(invitationId, actorId) {
  const invitation = await CommunityInvitation.findById(invitationId);
  if (!invitation) throw ApiError.notFound('Invitation not found');
  if (String(invitation.invitee) !== String(actorId)) {
    throw ApiError.forbidden('This invitation is not for you');
  }
  return invitation;
}

export async function acceptInvitation(invitationId, actorId) {
  const invitation = await loadInvitationForInvitee(invitationId, actorId);
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw ApiError.badRequest('This invitation is no longer pending');
  }
  const community = await Community.findById(invitation.community);
  if (!community) throw ApiError.notFound('Community not found');

  const already = await getMembership(community._id, actorId);
  await runInTransaction(async (session) => {
    invitation.status = INVITATION_STATUS.ACCEPTED;
    invitation.respondedAt = new Date();
    await invitation.save(sessionOptions(session));
    if (!already) {
      await addMember(
        { communityId: community._id, userId: actorId, role: MEMBER_ROLES.MEMBER },
        session
      );
    }
    await cancelPendingJoin(community._id, actorId, session);
  });

  emitDomainEvent(COMMUNITY_EVENTS.INVITATION_ACCEPTED, {
    communityId: community.id,
    actorId: String(actorId),
  });
  if (!already) {
    emitDomainEvent(COMMUNITY_EVENTS.MEMBER_JOINED, {
      communityId: community.id,
      actorId: String(actorId),
    });
  }

  return { accepted: true, community: await getCommunityBySlug(community.slug, actorId) };
}

export async function rejectInvitation(invitationId, actorId) {
  const invitation = await loadInvitationForInvitee(invitationId, actorId);
  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw ApiError.badRequest('This invitation is no longer pending');
  }
  invitation.status = INVITATION_STATUS.REJECTED;
  invitation.respondedAt = new Date();
  await invitation.save();

  emitDomainEvent(COMMUNITY_EVENTS.INVITATION_REJECTED, {
    communityId: String(invitation.community),
    actorId: String(actorId),
  });
  return { rejected: true };
}

export { recountMembers };
export default {
  createCommunity,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
};
