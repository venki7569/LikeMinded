import * as communityService from '../services/community.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const create = asyncHandler(async (req, res) => {
  const community = await communityService.createCommunity(req.user.id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Community created',
    data: { community },
  });
});

export const list = asyncHandler(async (req, res) => {
  const query = { ...req.query, mine: req.query.mine === 'true' || req.query.mine === '1' };
  const { communities, meta } = await communityService.listCommunities(req.user?.id, query);
  return sendSuccess(res, { message: 'Communities', data: { communities }, meta });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const community = await communityService.getCommunityBySlug(req.params.slug, req.user?.id);
  return sendSuccess(res, { message: 'Community', data: { community } });
});

export const update = asyncHandler(async (req, res) => {
  const community = await communityService.updateCommunity(req.params.slug, req.user.id, req.body);
  return sendSuccess(res, { message: 'Community updated', data: { community } });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await communityService.deleteCommunity(req.params.slug, req.user.id);
  return sendSuccess(res, { message: 'Community deleted', data: result });
});

export const join = asyncHandler(async (req, res) => {
  const result = await communityService.joinCommunity(req.params.slug, req.user.id);
  return sendSuccess(res, { message: 'Join processed', data: result });
});

export const leave = asyncHandler(async (req, res) => {
  const result = await communityService.leaveCommunity(req.params.slug, req.user.id);
  return sendSuccess(res, { message: 'Left community', data: result });
});

export const listJoinRequests = asyncHandler(async (req, res) => {
  const { requests, meta } = await communityService.listJoinRequests(
    req.params.slug,
    req.user.id,
    req.query
  );
  return sendSuccess(res, { message: 'Join requests', data: { requests }, meta });
});

export const approveJoinRequest = asyncHandler(async (req, res) => {
  const result = await communityService.approveJoinRequest(
    req.params.slug,
    req.user.id,
    req.params.requestId
  );
  return sendSuccess(res, { message: 'Join request approved', data: result });
});

export const rejectJoinRequest = asyncHandler(async (req, res) => {
  const result = await communityService.rejectJoinRequest(
    req.params.slug,
    req.user.id,
    req.params.requestId
  );
  return sendSuccess(res, { message: 'Join request rejected', data: result });
});

export const cancelJoinRequest = asyncHandler(async (req, res) => {
  const result = await communityService.cancelJoinRequest(
    req.params.slug,
    req.user.id,
    req.params.requestId
  );
  return sendSuccess(res, { message: 'Join request cancelled', data: result });
});

export const listMembers = asyncHandler(async (req, res) => {
  const { members, meta } = await communityService.listMembers(
    req.params.slug,
    req.user.id,
    req.query
  );
  return sendSuccess(res, { message: 'Members', data: { members }, meta });
});

export const removeMember = asyncHandler(async (req, res) => {
  const result = await communityService.removeMember(
    req.params.slug,
    req.user.id,
    req.params.userId
  );
  return sendSuccess(res, { message: 'Member removed', data: result });
});

export const promoteModerator = asyncHandler(async (req, res) => {
  const result = await communityService.promoteModerator(
    req.params.slug,
    req.user.id,
    req.params.userId
  );
  return sendSuccess(res, { message: 'Moderator promoted', data: result });
});

export const demoteModerator = asyncHandler(async (req, res) => {
  const result = await communityService.demoteModerator(
    req.params.slug,
    req.user.id,
    req.params.userId
  );
  return sendSuccess(res, { message: 'Moderator demoted', data: result });
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const community = await communityService.transferOwnership(
    req.params.slug,
    req.user.id,
    req.body.userId
  );
  return sendSuccess(res, { message: 'Ownership transferred', data: { community } });
});

export const createInvitation = asyncHandler(async (req, res) => {
  const result = await communityService.createInvitation(
    req.params.slug,
    req.user.id,
    req.body.userId
  );
  return sendSuccess(res, { statusCode: 201, message: 'Invitation sent', data: result });
});

export const listMyInvitations = asyncHandler(async (req, res) => {
  const { invitations, meta } = await communityService.listMyInvitations(req.user.id, req.query);
  return sendSuccess(res, { message: 'Invitations', data: { invitations }, meta });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const result = await communityService.acceptInvitation(req.params.invitationId, req.user.id);
  return sendSuccess(res, { message: 'Invitation accepted', data: result });
});

export const rejectInvitation = asyncHandler(async (req, res) => {
  const result = await communityService.rejectInvitation(req.params.invitationId, req.user.id);
  return sendSuccess(res, { message: 'Invitation declined', data: result });
});
