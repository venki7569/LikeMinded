import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email.service.js';
import {
  TOKEN_TYPES,
  consumeOneTimeToken,
  createOneTimeToken,
  issueRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from './token.service.js';

function assertUsable(user) {
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  if (user.isBanned) {
    throw ApiError.forbidden(user.bannedReason || 'This account has been suspended');
  }
}

async function buildSession(user, context) {
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, context);
  return { accessToken, refreshToken, user };
}

export async function register({ name, username, email, password }, context = {}) {
  const existing = await User.findOne({ $or: [{ email }, { username }] })
    .select('email username')
    .lean();

  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw ApiError.conflict(`That ${field} is already taken`, [{ field, message: `That ${field} is already taken` }]);
  }

  const user = await User.create({ name, username, email, password });

  const { rawToken } = await createOneTimeToken(user, TOKEN_TYPES.EMAIL_VERIFICATION);
  await sendVerificationEmail(user, rawToken);

  logger.info('User registered', { userId: user.id });
  return buildSession(user, context);
}

export async function login({ identifier, password }, context = {}) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalized }, { username: normalized }],
  }).select('+password');

  // Same message for unknown user and wrong password, so accounts cannot be probed.
  const invalid = ApiError.unauthorized('Incorrect email/username or password');
  if (!user) throw invalid;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw invalid;

  assertUsable(user);

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return buildSession(user, context);
}

export async function refreshSession(rawToken, context = {}) {
  const { userId, refreshToken } = await rotateRefreshToken(rawToken, context);

  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  assertUsable(user);

  return { accessToken: signAccessToken(user), refreshToken, user };
}

export async function logout(rawToken) {
  if (rawToken) await revokeRefreshToken(rawToken);
}

export async function logoutEverywhere(userId) {
  await revokeAllRefreshTokens(userId);
}

export async function verifyEmail(rawToken) {
  const userId = await consumeOneTimeToken(rawToken, TOKEN_TYPES.EMAIL_VERIFICATION);

  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Account no longer exists');

  if (!user.isEmailVerified) {
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });
  }

  return user;
}

export async function resendVerificationEmail(email) {
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  // Always resolve, so this endpoint cannot enumerate registered emails.
  if (!user || user.isEmailVerified) return;

  const { rawToken } = await createOneTimeToken(user, TOKEN_TYPES.EMAIL_VERIFICATION);
  await sendVerificationEmail(user, rawToken);
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return;

  const { rawToken } = await createOneTimeToken(user, TOKEN_TYPES.PASSWORD_RESET);
  await sendPasswordResetEmail(user, rawToken);
}

export async function resetPassword(rawToken, newPassword) {
  const userId = await consumeOneTimeToken(rawToken, TOKEN_TYPES.PASSWORD_RESET);

  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('Account no longer exists');

  user.password = newPassword;
  await user.save();

  // A reset implies the old credentials may be compromised.
  await revokeAllRefreshTokens(user.id);
  await sendPasswordChangedEmail(user);

  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('Account no longer exists');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw ApiError.badRequest('Your current password is incorrect');

  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current one');
  }

  user.password = newPassword;
  await user.save();

  await revokeAllRefreshTokens(user.id);
  await sendPasswordChangedEmail(user);

  return user;
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Account no longer exists');
  return user;
}
