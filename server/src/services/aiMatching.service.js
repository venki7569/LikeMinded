import User from '../models/user.model.js';
import { Block } from '../models/block.model.js';
import { Connection } from '../models/connection.model.js';
import ApiError from '../utils/ApiError.js';
import { toPublicCard } from '../utils/publicCard.js';

// Complementary role pairings
const COMPLEMENTARY_PAIRS = [
  ['frontend', 'backend'],
  ['designer', 'developer'],
  ['design', 'engineer'],
  ['founder', 'engineer'],
  ['product', 'engineer'],
  ['marketing', 'product'],
  ['data', 'engineer'],
  ['ai', 'software'],
];

/**
 * Tokenize string into clean words
 */
function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Build profile text representation
 */
function extractProfileCorpus(user) {
  const parts = [
    ...(user.skills || []).map((s) => `${s} ${s}`), // weight skills double
    ...(user.interests || []).map((i) => `${i} ${i}`), // weight interests double
    user.bio || '',
    user.occupation || '',
    ...(user.education || []).map((e) => `${e.fieldOfStudy || ''} ${e.degree || ''}`),
    ...(user.experience || []).map((e) => `${e.title || ''} ${e.description || ''}`),
    ...(user.projects || []).map((p) => `${p.title || ''} ${p.description || ''} ${(p.technologies || []).join(' ')}`),
  ];
  return parts.join(' ');
}

/**
 * Compute Term Frequency
 */
function computeTF(tokens) {
  const tf = {};
  const len = tokens.length || 1;
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1 / len;
  }
  return tf;
}

/**
 * Cosine similarity between two TF-IDF vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key in vecA) {
    const valA = vecA[key];
    normA += valA * valA;
    if (vecB[key]) {
      dotProduct += valA * vecB[key];
    }
  }

  for (const key in vecB) {
    const valB = vecB[key];
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Explain match reasons between two users
 */
function explainMatch(userA, userB, cosineScore) {
  const skillsA = new Set((userA.skills || []).map((s) => s.toLowerCase()));
  const skillsB = new Set((userB.skills || []).map((s) => s.toLowerCase()));
  const sharedSkills = [...skillsA].filter((s) => skillsB.has(s));

  const interestsA = new Set((userA.interests || []).map((i) => i.toLowerCase()));
  const interestsB = new Set((userB.interests || []).map((i) => i.toLowerCase()));
  const sharedInterests = [...interestsA].filter((i) => interestsB.has(i));

  const roleA = (userA.occupation || '').toLowerCase();
  const roleB = (userB.occupation || '').toLowerCase();

  let isComplementary = false;
  let complementaryReason = null;

  for (const [r1, r2] of COMPLEMENTARY_PAIRS) {
    if (
      (roleA.includes(r1) && roleB.includes(r2)) ||
      (roleA.includes(r2) && roleB.includes(r1))
    ) {
      isComplementary = true;
      complementaryReason = `Complementary skills: ${userA.occupation || r1} + ${userB.occupation || r2}`;
      break;
    }
  }

  // Calculate composite percentage
  let score = cosineScore * 60; // TF-IDF accounts for 60%
  if (sharedSkills.length > 0) score += Math.min(20, sharedSkills.length * 5);
  if (sharedInterests.length > 0) score += Math.min(15, sharedInterests.length * 5);
  if (isComplementary) score += 10;

  // Normalize between 40% and 98%
  const percentage = Math.min(99, Math.max(35, Math.round(score + 15)));

  const reasons = [];
  if (sharedSkills.length > 0) {
    reasons.push(`Shared skills: ${sharedSkills.slice(0, 4).join(', ')}`);
  }
  if (sharedInterests.length > 0) {
    reasons.push(`Common interests: ${sharedInterests.slice(0, 4).join(', ')}`);
  }
  if (complementaryReason) {
    reasons.push(complementaryReason);
  }
  if (reasons.length === 0) {
    reasons.push('Aligned profile goals and professional background');
  }

  return {
    matchScore: percentage,
    sharedSkills,
    sharedInterests,
    isComplementary,
    reasons,
    summary: `${percentage}% Match — ${reasons[0]}`,
  };
}

export async function getRecommendations(userId, { limit = 10 } = {}) {
  const me = await User.findById(userId).lean();
  if (!me) throw ApiError.notFound('User not found');

  // Fetch blocked and connected IDs
  const [blocks, connections] = await Promise.all([
    Block.find({ $or: [{ blocker: userId }, { blocked: userId }] }).lean(),
    Connection.find({
      $or: [{ userLow: userId }, { userHigh: userId }],
      endedAt: null,
    }).lean(),
  ]);

  const excludedIds = new Set([String(userId)]);
  blocks.forEach((b) => {
    excludedIds.add(String(b.blocker));
    excludedIds.add(String(b.blocked));
  });
  connections.forEach((c) => {
    excludedIds.add(String(c.userLow));
    excludedIds.add(String(c.userHigh));
  });

  // Candidate pool
  const candidates = await User.find({
    _id: { $nin: Array.from(excludedIds) },
    isActive: true,
    isBanned: false,
  })
    .limit(100)
    .lean();

  if (candidates.length === 0) {
    return [];
  }

  // Build corpus and vocabulary
  const myCorpus = extractProfileCorpus(me);
  const myTokens = tokenize(myCorpus);
  const myTF = computeTF(myTokens);

  // Compute DF across candidates + me
  const df = {};
  const allDocsTokens = [myTokens, ...candidates.map((c) => tokenize(extractProfileCorpus(c)))];
  const numDocs = allDocsTokens.length;

  for (const docTokens of allDocsTokens) {
    const seen = new Set(docTokens);
    for (const term of seen) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  // Calculate IDF
  const idf = {};
  for (const term in df) {
    idf[term] = Math.log((numDocs + 1) / (df[term] + 1)) + 1;
  }

  // Vector for me
  const myVector = {};
  for (const term in myTF) {
    myVector[term] = myTF[term] * (idf[term] || 1);
  }

  // Score each candidate
  const scored = [];
  for (const candidate of candidates) {
    const candTokens = tokenize(extractProfileCorpus(candidate));
    const candTF = computeTF(candTokens);
    const candVector = {};
    for (const term in candTF) {
      candVector[term] = candTF[term] * (idf[term] || 1);
    }

    const cosine = cosineSimilarity(myVector, candVector);
    const explanation = explainMatch(me, candidate, cosine);

    scored.push({
      user: toPublicCard(candidate),
      ...explanation,
    });
  }

  // Sort descending by matchScore
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, Math.min(50, Math.max(1, parseInt(limit, 10) || 10)));
}

export async function explainUserMatch(userId, targetUserId) {
  const [userA, userB] = await Promise.all([
    User.findById(userId).lean(),
    User.findById(targetUserId).lean(),
  ]);

  if (!userA || !userB) {
    throw ApiError.notFound('User not found');
  }

  const tokensA = tokenize(extractProfileCorpus(userA));
  const tokensB = tokenize(extractProfileCorpus(userB));

  const tfA = computeTF(tokensA);
  const tfB = computeTF(tokensB);

  const cosine = cosineSimilarity(tfA, tfB);
  return explainMatch(userA, userB, cosine);
}

export default {
  getRecommendations,
  explainUserMatch,
};
