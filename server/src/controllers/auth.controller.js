import env from '../config/env.js';
import * as authService from '../services/auth.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { parseDuration } from '../utils/duration.js';

const REFRESH_COOKIE = 'refreshToken';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    // Cross-site cookies (Vercel client → Render API) require `none` + secure.
    sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
    maxAge: parseDuration(env.JWT_REFRESH_EXPIRES_IN),
    path: `${env.API_PREFIX}/auth`,
  };
}

function requestContext(req) {
  return { userAgent: req.get('user-agent') ?? '', ipAddress: req.ip ?? '' };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
}

export const register = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.register(
    req.body,
    requestContext(req)
  );

  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Check your email to verify your address.',
    data: { user, accessToken },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.login(
    req.body,
    requestContext(req)
  );

  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { message: 'Signed in successfully', data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
  if (!presented) throw ApiError.unauthorized('No refresh token provided');

  const { accessToken, refreshToken, user } = await authService.refreshSession(
    presented,
    requestContext(req)
  );

  setRefreshCookie(res, refreshToken);
  return sendSuccess(res, { message: 'Session refreshed', data: { user, accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Signed out successfully' });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutEverywhere(req.user.id);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Signed out of all devices' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  return sendSuccess(res, { message: 'Email verified successfully', data: { user } });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  return sendSuccess(res, {
    message: 'If that address needs verification, a new link is on its way.',
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return sendSuccess(res, {
    message: 'If an account exists for that address, a reset link has been sent.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Password reset successfully. Please sign in.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  clearRefreshCookie(res);
  return sendSuccess(res, {
    message: 'Password changed successfully. Please sign in again.',
  });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return sendSuccess(res, { message: 'Current user', data: { user } });
});
