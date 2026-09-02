import mongoose from 'mongoose';
import User from '../models/user.model.js';
import ConnectionRequest, { REQUEST_STATUS } from '../models/connectionRequest.model.js';
import Connection from '../models/connection.model.js';
import Block from '../models/block.model.js';
import ApiError from '../utils/ApiError.js';
import { orderedPair, otherUserId, pairKey } from '../utils/pair.js';
import { CARD_SELECT, RELATIONSHIP_STATUS, sharedCount, toPublicCard } from '../utils/publicCard.js';
import { CONNECTION_EVENTS, emitDomainEvent } from '../events/domainEvents.js';
import { buildPaginationMeta } from '../utils/apiResponse.js';

const ObjectId = mongoose.Types.ObjectId;

function asId(value) {
  return new ObjectId(String(value));
}

function isDuplicateKey(error) {
  return error?.code === 11000;
}

async function findActiveUser(userId) {
  const user = await User.findOne({ _id: userId, isActive: true, isBanned: false }).select(
    `${CARD_SELECT} isActive isBanned`
  );
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function isBlockedEitherWay(userA, userB) {
  const count = await Block.countDocuments({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
  return count > 0;
}

export async function viewerBlockedTarget(viewerId, targetId) {
  return Boolean(await Block.exists({ blocker: viewerId, blocked: targetId }));
}

async function getActiveConnection(userA, userB) {
  return Connection.findOne({ pairKey: pairKey(userA, userB), endedAt: null });
}

async function getPendingRequest(userA, userB) {
  return ConnectionRequest.findOne({
    pairKey: pairKey(userA, userB),
    status: REQUEST_STATUS.PENDING,
  });
}

export async function areConnected(userA, userB) {
  return Boolean(await Connection.exists({ pairKey: pairKey(userA, userB), endedAt: null }));
}

export async function targetBlockedViewer(targetId, viewerId) {
  return Boolean(await Block.exists({ blocker: targetId, blocked: viewerId }));
}

export async function getConnectedIds(userId) {
  const rows = await Connection.find({
    endedAt: null,
    $or: [{ userLow: userId }, { userHigh: userId }],
  })
    .select('userLow userHigh')
    .lean();

  return new Set(
    rows.map((row) =>
      String(row.userLow) === String(userId) ? String(row.userHigh) : String(row.userLow)
    )
  );
}

export async function getMutualCounts(viewerId, targetIds) {
  const targets = targetIds.map(String).filter((id) => id !== String(viewerId));
  const counts = Object.fromEntries(targets.map((id) => [id, 0]));
  if (targets.length === 0) return counts;

  const viewerFriends = await getConnectedIds(viewerId);
  if (viewerFriends.size === 0) return counts;

  const objectTargets = targets.map((id) => asId(id));
  const rows = await Connection.find({
    endedAt: null,
    $or: [{ userLow: { $in: objectTargets } }, { userHigh: { $in: objectTargets } }],
  })
    .select('userLow userHigh')
    .lean();

  const friendsByTarget = Object.fromEntries(targets.map((id) => [id, new Set()]));
  for (const row of rows) {
    const low = String(row.userLow);
    const high = String(row.userHigh);
    if (friendsByTarget[low]) friendsByTarget[low].add(high);
    if (friendsByTarget[high]) friendsByTarget[high].add(low);
  }

  for (const target of targets) {
    let mutual = 0;
    for (const friend of friendsByTarget[target]) {
      if (friend !== String(viewerId) && viewerFriends.has(friend)) mutual += 1;
    }
    counts[target] = mutual;
  }
  return counts;
}

/**
 * Batch relationship lookup so list endpoints avoid N+1 queries.
 * Blocked-either-way targets should already be filtered from discovery.
 */
export async function getRelationshipMap(viewerId, targetIds) {
  const ids = [...new Set(targetIds.map(String))].filter((id) => id !== String(viewerId));
  const map = Object.fromEntries(
    ids.map((id) => [id, { status: RELATIONSHIP_STATUS.NONE, requestId: null }])
  );
  if (ids.length === 0) return map;

  const objectIds = ids.map((id) => asId(id));
  const [blockedByMe, pending, connections] = await Promise.all([
    Block.find({ blocker: viewerId, blocked: { $in: objectIds } }).select('blocked').lean(),
    ConnectionRequest.find({
      status: REQUEST_STATUS.PENDING,
      pairKey: { $in: ids.map((id) => pairKey(viewerId, id)) },
    })
      .select('sender receiver')
      .lean(),
    Connection.find({
      endedAt: null,
      pairKey: { $in: ids.map((id) => pairKey(viewerId, id)) },
    })
      .select('pairKey request')
      .lean(),
  ]);

  for (const row of blockedByMe) {
    map[String(row.blocked)] = { status: RELATIONSHIP_STATUS.BLOCKED, requestId: null };
  }

  const connectedKeys = new Set(connections.map((row) => row.pairKey));
  for (const id of ids) {
    if (map[id].status === RELATIONSHIP_STATUS.BLOCKED) continue;
    if (connectedKeys.has(pairKey(viewerId, id))) {
      map[id] = { status: RELATIONSHIP_STATUS.CONNECTED, requestId: null };
    }
  }

  for (const row of pending) {
    const other = otherUserId(viewerId, row.sender, row.receiver);
    const key = String(other);
    if (!map[key] || map[key].status !== RELATIONSHIP_STATUS.NONE) continue;
    const outgoing = String(row.sender) === String(viewerId);
    map[key] = {
      status: outgoing ? RELATIONSHIP_STATUS.OUTGOING_PENDING : RELATIONSHIP_STATUS.INCOMING_PENDING,
      requestId: String(row._id),
    };
  }

  return map;
}

export async function getRelationship(viewerId, targetId) {
  if (String(viewerId) === String(targetId)) {
    return { status: RELATIONSHIP_STATUS.NONE, requestId: null };
  }

  if (await viewerBlockedTarget(viewerId, targetId)) {
    return { status: RELATIONSHIP_STATUS.BLOCKED, requestId: null };
  }

  if (await isBlockedEitherWay(viewerId, targetId)) {
    // They blocked the viewer — do not leak that as a "blocked" control on their profile.
    return { status: RELATIONSHIP_STATUS.NONE, requestId: null };
  }

  const connection = await getActiveConnection(viewerId, targetId);
  if (connection) return { status: RELATIONSHIP_STATUS.CONNECTED, requestId: connection.request ?? null };

  const pending = await getPendingRequest(viewerId, targetId);
  if (pending) {
    const outgoing = String(pending.sender) === String(viewerId);
    return {
      status: outgoing ? RELATIONSHIP_STATUS.OUTGOING_PENDING : RELATIONSHIP_STATUS.INCOMING_PENDING,
      requestId: pending.id,
    };
  }

  return { status: RELATIONSHIP_STATUS.NONE, requestId: null };
}

async function assertCanInteract(viewerId, targetId) {
  if (String(viewerId) === String(targetId)) {
    throw ApiError.badRequest('You cannot connect with yourself');
  }
  await findActiveUser(targetId);
  if (await isBlockedEitherWay(viewerId, targetId)) {
    throw ApiError.forbidden('You cannot interact with this user');
  }
}

async function activateConnection(request) {
  const ordered = orderedPair(request.sender, request.receiver);
  try {
    return await Connection.create({
      ...ordered,
      request: request._id,
    });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const existing = await Connection.findOne({ pairKey: ordered.pairKey, endedAt: null });
    if (existing) return existing;
    throw error;
  }
}

export async function sendRequest(senderId, receiverId) {
  await assertCanInteract(senderId, receiverId);

  const existingConnection = await getActiveConnection(senderId, receiverId);
  if (existingConnection) throw ApiError.conflict('You are already connected');

  const pending = await getPendingRequest(senderId, receiverId);
  if (pending) {
    if (String(pending.sender) === String(senderId)) {
      throw ApiError.conflict('A connection request is already pending');
    }
    // They already asked — treat the reciprocal send as an accept.
    return acceptRequest(senderId, pending.id);
  }

  try {
    const request = await ConnectionRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: REQUEST_STATUS.PENDING,
    });
    emitDomainEvent(CONNECTION_EVENTS.REQUEST_RECEIVED, {
      requestId: request.id,
      senderId: String(senderId),
      receiverId: String(receiverId),
    });
    return { request, relationship: await getRelationship(senderId, receiverId) };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const raced = await getPendingRequest(senderId, receiverId);
    if (raced && String(raced.receiver) === String(senderId)) {
      return acceptRequest(senderId, raced.id);
    }
    throw ApiError.conflict('A connection request is already pending');
  }
}

export async function acceptRequest(actorId, requestId) {
  const request = await ConnectionRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Connection request not found');
  if (String(request.receiver) !== String(actorId)) {
    throw ApiError.forbidden('You can only accept requests sent to you');
  }
  if (request.status !== REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }
  if (await isBlockedEitherWay(request.sender, request.receiver)) {
    throw ApiError.forbidden('You cannot interact with this user');
  }

  request.status = REQUEST_STATUS.ACCEPTED;
  request.respondedAt = new Date();
  await request.save();
  await activateConnection(request);

  emitDomainEvent(CONNECTION_EVENTS.REQUEST_ACCEPTED, {
    requestId: request.id,
    actorId: String(actorId),
    otherId: String(request.sender),
  });

  return { request, relationship: await getRelationship(actorId, request.sender) };
}

export async function rejectRequest(actorId, requestId) {
  const request = await ConnectionRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Connection request not found');
  if (String(request.receiver) !== String(actorId)) {
    throw ApiError.forbidden('You can only reject requests sent to you');
  }
  if (request.status !== REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }

  request.status = REQUEST_STATUS.REJECTED;
  request.respondedAt = new Date();
  await request.save();

  emitDomainEvent(CONNECTION_EVENTS.REQUEST_REJECTED, {
    requestId: request.id,
    actorId: String(actorId),
    otherId: String(request.sender),
  });

  return { request, relationship: await getRelationship(actorId, request.sender) };
}

export async function cancelRequest(actorId, requestId) {
  const request = await ConnectionRequest.findById(requestId);
  if (!request) throw ApiError.notFound('Connection request not found');
  if (String(request.sender) !== String(actorId)) {
    throw ApiError.forbidden('You can only cancel requests you sent');
  }
  if (request.status !== REQUEST_STATUS.PENDING) {
    throw ApiError.badRequest('This request is no longer pending');
  }

  request.status = REQUEST_STATUS.CANCELLED;
  request.respondedAt = new Date();
  await request.save();

  emitDomainEvent(CONNECTION_EVENTS.REQUEST_CANCELLED, {
    requestId: request.id,
    actorId: String(actorId),
    otherId: String(request.receiver),
  });

  return { request, relationship: await getRelationship(actorId, request.receiver) };
}

export async function removeConnection(actorId, otherId) {
  if (String(actorId) === String(otherId)) {
    throw ApiError.badRequest('You cannot remove a connection with yourself');
  }

  const connection = await getActiveConnection(actorId, otherId);
  if (!connection) throw ApiError.notFound('You are not connected with this user');

  connection.endedAt = new Date();
  connection.endedReason = 'removed';
  await connection.save();

  emitDomainEvent(CONNECTION_EVENTS.CONNECTION_REMOVED, {
    actorId: String(actorId),
    otherId: String(otherId),
  });

  return { relationship: await getRelationship(actorId, otherId) };
}

async function listPagedRequests({ userId, direction, page, limit }) {
  const filter =
    direction === 'incoming'
      ? { receiver: userId, status: REQUEST_STATUS.PENDING }
      : { sender: userId, status: REQUEST_STATUS.PENDING };
  const populate = direction === 'incoming' ? 'sender' : 'receiver';

  const [total, rows] = await Promise.all([
    ConnectionRequest.countDocuments(filter),
    ConnectionRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: populate, select: CARD_SELECT }),
  ]);

  const counterpartIds = rows.map((row) => row[populate]?._id).filter(Boolean);
  const mutuals = await getMutualCounts(userId, counterpartIds);

  const requests = rows
    .filter((row) => row[populate])
    .map((row) => {
      const counterpart = row[populate];
      return {
        id: row.id,
        createdAt: row.createdAt,
        user: toPublicCard(counterpart),
        mutualConnectionCount: mutuals[String(counterpart._id)] ?? 0,
      };
    });

  return { requests, meta: buildPaginationMeta({ page, limit, total }) };
}

export function listIncoming(userId, page, limit) {
  return listPagedRequests({ userId, direction: 'incoming', page, limit });
}

export function listOutgoing(userId, page, limit) {
  return listPagedRequests({ userId, direction: 'outgoing', page, limit });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listConnections(userId, { page, limit, q } = {}) {
  const connectedIds = [...(await getConnectedIds(userId))].map((id) => asId(id));
  const userFilter = { _id: { $in: connectedIds }, isActive: true, isBanned: false };
  const needle = q?.trim();
  if (needle) {
    const pattern = escapeRegex(needle);
    userFilter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { username: { $regex: pattern, $options: 'i' } },
      { occupation: { $regex: pattern, $options: 'i' } },
    ];
  }

  const [total, users, viewer, connectedAtRows] = await Promise.all([
    User.countDocuments(userFilter),
    User.find(userFilter)
      .select(CARD_SELECT)
      .sort(needle ? { name: 1 } : { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.findById(userId).select('interests'),
    Connection.find({
      endedAt: null,
      $or: [{ userLow: userId }, { userHigh: userId }],
    })
      .select('userLow userHigh createdAt')
      .lean(),
  ]);

  const connectedAt = new Map(
    connectedAtRows.map((row) => [
      String(otherUserId(userId, row.userLow, row.userHigh)),
      row.createdAt,
    ])
  );
  const mutuals = await getMutualCounts(
    userId,
    users.map((user) => user.id)
  );

  const connections = users.map((user) => ({
    connectedAt: connectedAt.get(user.id) ?? null,
    user: toPublicCard(user),
    relationshipStatus: RELATIONSHIP_STATUS.CONNECTED,
    mutualConnectionCount: mutuals[user.id] ?? 0,
    sharedInterestCount: sharedCount(viewer?.interests, user.interests),
  }));

  return { connections, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function getRelationshipPayload(viewerId, targetId) {
  await findActiveUser(targetId);
  const [relationship, mutuals] = await Promise.all([
    getRelationship(viewerId, targetId),
    getMutualCounts(viewerId, [targetId]),
  ]);
  return {
    ...relationship,
    mutualConnectionCount: mutuals[String(targetId)] ?? 0,
  };
}

async function cancelPendingBetween(userA, userB) {
  await ConnectionRequest.updateMany(
    { pairKey: pairKey(userA, userB), status: REQUEST_STATUS.PENDING },
    { status: REQUEST_STATUS.CANCELLED, respondedAt: new Date() }
  );
}

async function endConnectionBetween(userA, userB, reason) {
  await Connection.updateMany(
    { pairKey: pairKey(userA, userB), endedAt: null },
    { endedAt: new Date(), endedReason: reason }
  );
}

export async function blockUser(actorId, targetId) {
  if (String(actorId) === String(targetId)) {
    throw ApiError.badRequest('You cannot block yourself');
  }
  await findActiveUser(targetId);

  try {
    await Block.create({ blocker: actorId, blocked: targetId });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    throw ApiError.conflict('This user is already blocked');
  }

  await cancelPendingBetween(actorId, targetId);
  await endConnectionBetween(actorId, targetId, 'blocked');

  emitDomainEvent(CONNECTION_EVENTS.USER_BLOCKED, {
    actorId: String(actorId),
    otherId: String(targetId),
  });

  return { relationship: { status: RELATIONSHIP_STATUS.BLOCKED, requestId: null } };
}

export async function unblockUser(actorId, targetId) {
  const result = await Block.findOneAndDelete({ blocker: actorId, blocked: targetId });
  if (!result) throw ApiError.notFound('This user is not blocked');

  emitDomainEvent(CONNECTION_EVENTS.USER_UNBLOCKED, {
    actorId: String(actorId),
    otherId: String(targetId),
  });

  return { relationship: await getRelationship(actorId, targetId) };
}

export async function listBlocked(actorId, page, limit) {
  const filter = { blocker: actorId };
  const [total, rows] = await Promise.all([
    Block.countDocuments(filter),
    Block.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'blocked', select: CARD_SELECT }),
  ]);

  return {
    blocked: rows
      .filter((row) => row.blocked)
      .map((row) => ({
        blockedAt: row.createdAt,
        user: toPublicCard(row.blocked),
      })),
    meta: buildPaginationMeta({ page, limit, total }),
  };
}

export async function getBlockedIdSet(userId) {
  const rows = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  })
    .select('blocker blocked')
    .lean();

  const ids = new Set();
  for (const row of rows) {
    ids.add(String(row.blocker) === String(userId) ? String(row.blocked) : String(row.blocker));
  }
  return ids;
}

export { RELATIONSHIP_STATUS };
