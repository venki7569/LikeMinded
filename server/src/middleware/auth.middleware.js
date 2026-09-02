import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../services/token.service.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.accessToken ?? null;
}

/** Rejects the request unless a valid access token maps to a usable account. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required');

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);

  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  if (user.isBanned) throw ApiError.forbidden(user.bannedReason || 'This account is suspended');
  if (user.hasPasswordChangedSince(payload.iatMs ?? payload.iat * 1000)) {
    throw ApiError.unauthorized('Password was changed. Please sign in again');
  }

  req.user = user;
  return next();
});

/** Attaches `req.user` when a token is present, but never blocks the request. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user?.isActive && !user.isBanned) req.user = user;
  } catch {
    // Anonymous access is valid here, so an unusable token is simply ignored.
  }

  return next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };
}

export function requireVerifiedEmail(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized('Authentication required'));
  if (!req.user.isEmailVerified) {
    return next(ApiError.forbidden('Please verify your email address to continue'));
  }
  return next();
}

export default requireAuth;
