import User, { PROFILE_VISIBILITY } from '../models/user.model.js';
import { buildPaginationMeta } from '../utils/apiResponse.js';
import {
  CARD_SELECT,
  RELATIONSHIP_STATUS,
  sharedCount,
  toPublicCard,
} from '../utils/publicCard.js';
import {
  getBlockedIdSet,
  getConnectedIds,
  getMutualCounts,
  getRelationshipMap,
} from './connection.service.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitTags(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 2);
}

/**
 * People discovery. Ranking fields (`relationshipStatus`, `mutualConnectionCount`,
 * `sharedInterestCount`) are populated now so Phase 9 can add a `matchScore`
 * without changing the item shape. Search is Mongo filtering only — no AI.
 */
export async function discoverPeople(viewerId, query) {
  const { q, skill, skills, interest, interests, occupation, city, country, page, limit } = query;
  const [blockedIds, connectedIds, viewer] = await Promise.all([
    getBlockedIdSet(viewerId),
    getConnectedIds(viewerId),
    User.findById(viewerId).select('interests skills'),
  ]);

  const exclude = [String(viewerId), ...blockedIds];
  const connectedObjectIds = [...connectedIds];

  const clauses = [
    { _id: { $nin: exclude } },
    { isActive: true },
    { isBanned: false },
    connectedObjectIds.length > 0
      ? {
          $or: [
            { profileVisibility: PROFILE_VISIBILITY.PUBLIC },
            { _id: { $in: connectedObjectIds } },
          ],
        }
      : { profileVisibility: PROFILE_VISIBILITY.PUBLIC },
  ];

  const needle = q?.trim();
  if (needle) {
    const pattern = escapeRegex(needle);
    clauses.push({
      $or: [
        { username: { $regex: pattern, $options: 'i' } },
        { name: { $regex: pattern, $options: 'i' } },
      ],
    });
  }

  const skillTags = [...splitTags(skill), ...splitTags(skills)];
  if (skillTags.length > 0) clauses.push({ skills: { $all: skillTags } });

  const interestTags = [...splitTags(interest), ...splitTags(interests)];
  if (interestTags.length > 0) clauses.push({ interests: { $all: interestTags } });

  if (occupation?.trim()) {
    clauses.push({ occupation: { $regex: escapeRegex(occupation.trim()), $options: 'i' } });
  }
  if (city?.trim()) {
    clauses.push({ 'location.city': { $regex: `^${escapeRegex(city.trim())}$`, $options: 'i' } });
  }
  if (country?.trim()) {
    clauses.push({
      'location.country': { $regex: `^${escapeRegex(country.trim())}$`, $options: 'i' },
    });
  }

  const filter = clauses.length === 1 ? clauses[0] : { $and: clauses };

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select(CARD_SELECT)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  const ids = users.map((user) => user.id);
  const [mutuals, relationships] = await Promise.all([
    getMutualCounts(viewerId, ids),
    getRelationshipMap(viewerId, ids),
  ]);

  const people = users.map((user) => {
    const relation = relationships[user.id] ?? {
      status: RELATIONSHIP_STATUS.NONE,
      requestId: null,
    };
    return {
      user: toPublicCard(user),
      relationshipStatus: relation.status,
      requestId: relation.requestId,
      mutualConnectionCount: mutuals[user.id] ?? 0,
      sharedInterestCount: sharedCount(viewer?.interests, user.interests),
      sharedSkillCount: sharedCount(viewer?.skills, user.skills),
    };
  });

  return { people, meta: buildPaginationMeta({ page, limit, total }) };
}

export default discoverPeople;
