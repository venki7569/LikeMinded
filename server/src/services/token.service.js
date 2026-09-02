import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { Token, TOKEN_TYPES } from '../models/token.model.js';
import ApiError from '../utils/ApiError.js';
import { durationFromNow, parseDuration } from '../utils/duration.js';

const ONE_TIME_TOKEN_TTL = Object.freeze({
  [TOKEN_TYPES.EMAIL_VERIFICATION]: '24h',
  [TOKEN_TYPES.PASSWORD_RESET]: '1h',
});

/** Tokens are stored hashed; the raw value only ever leaves in a response. */
export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id ?? user._id.toString(),
      role: user.role,
      email: user.email,
      // Millisecond-precision issue time; `iat` alone is too coarse to tell a
      // token apart from a password change made in the same second.
      iatMs: Date.now(),
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, issuer: 'likeminded' }
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'likeminded' });
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    throw ApiError.unauthorized(message);
  }
}

/**
 * Refresh tokens are opaque random strings rather than JWTs so they can be
 * revoked server-side. The JWT wrapper only carries the lookup id.
 */
export async function issueRefreshToken(user, context = {}) {
  const rawToken = generateRawToken();

  await Token.create({
    user: user.id ?? user._id,
    tokenHash: hashToken(rawToken),
    type: TOKEN_TYPES.REFRESH,
    expiresAt: durationFromNow(env.JWT_REFRESH_EXPIRES_IN),
    userAgent: context.userAgent ?? '',
    ipAddress: context.ipAddress ?? '',
  });

  return rawToken;
}

/**
 * Rotates a refresh token. If a token that was already rotated is presented
 * again, every session for that user is revoked — the classic reuse-detection
 * response to a stolen token.
 */
export async function rotateRefreshToken(rawToken, context = {}) {
  const tokenHash = hashToken(rawToken);
  const stored = await Token.findOne({ tokenHash, type: TOKEN_TYPES.REFRESH });

  if (!stored) throw ApiError.unauthorized('Invalid refresh token');

  if (!stored.isActive()) {
    if (stored.replacedByHash) {
      logger.warn('Refresh token reuse detected; revoking all sessions', {
        userId: stored.user.toString(),
      });
      await revokeAllRefreshTokens(stored.user);
    }
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  const newRawToken = generateRawToken();
  const newHash = hashToken(newRawToken);

  await Token.create({
    user: stored.user,
    tokenHash: newHash,
    type: TOKEN_TYPES.REFRESH,
    expiresAt: durationFromNow(env.JWT_REFRESH_EXPIRES_IN),
    userAgent: context.userAgent ?? '',
    ipAddress: context.ipAddress ?? '',
  });

  stored.usedAt = new Date();
  stored.replacedByHash = newHash;
  await stored.save();

  return { userId: stored.user, refreshToken: newRawToken };
}

export async function revokeRefreshToken(rawToken) {
  const result = await Token.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), type: TOKEN_TYPES.REFRESH, revokedAt: null },
    { revokedAt: new Date() }
  );
  return Boolean(result);
}

export async function revokeAllRefreshTokens(userId) {
  await Token.updateMany(
    { user: userId, type: TOKEN_TYPES.REFRESH, revokedAt: null },
    { revokedAt: new Date() }
  );
}

export async function createOneTimeToken(user, type) {
  const ttl = ONE_TIME_TOKEN_TTL[type];
  if (!ttl) throw new Error(`Unsupported one-time token type: ${type}`);

  // Only one live token per purpose, so older emailed links stop working.
  await Token.updateMany(
    { user: user.id ?? user._id, type, usedAt: null, revokedAt: null },
    { revokedAt: new Date() }
  );

  const rawToken = generateRawToken();
  await Token.create({
    user: user.id ?? user._id,
    tokenHash: hashToken(rawToken),
    type,
    expiresAt: durationFromNow(ttl),
  });

  return { rawToken, expiresInMs: parseDuration(ttl) };
}

export async function consumeOneTimeToken(rawToken, type) {
  const stored = await Token.findOne({ tokenHash: hashToken(rawToken), type });

  if (!stored || !stored.isActive()) {
    throw ApiError.badRequest('This link is invalid or has expired');
  }

  stored.usedAt = new Date();
  await stored.save();

  return stored.user;
}

export { TOKEN_TYPES };
