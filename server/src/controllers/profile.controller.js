import * as profileService from '../services/profile.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getMe = asyncHandler(async (req, res) => {
  const profile = await profileService.getOwnProfile(req.user.id);
  return sendSuccess(res, { message: 'Your profile', data: { profile } });
});

export const getByUsername = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfileByUsername(req.params.username, req.user);
  return sendSuccess(res, { message: 'Profile', data: { profile } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const profile = await profileService.updateOwnProfile(req.user.id, req.body);
  return sendSuccess(res, { message: 'Profile updated', data: { profile } });
});

export const patchSkills = asyncHandler(async (req, res) => {
  const profile = await profileService.replaceSkills(req.user.id, req.body.skills);
  return sendSuccess(res, { message: 'Skills updated', data: { profile } });
});

export const patchInterests = asyncHandler(async (req, res) => {
  const profile = await profileService.replaceInterests(req.user.id, req.body.interests);
  return sendSuccess(res, { message: 'Interests updated', data: { profile } });
});

export const checkUsername = asyncHandler(async (req, res) => {
  const result = await profileService.checkUsernameAvailability(
    req.params.username,
    req.user?.id
  );
  return sendSuccess(res, { message: 'Username availability', data: result });
});

export const getCompleteness = asyncHandler(async (req, res) => {
  const completeness = await profileService.getOwnCompleteness(req.user.id);
  return sendSuccess(res, { message: 'Profile completeness', data: { completeness } });
});
