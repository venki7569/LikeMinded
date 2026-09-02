import * as connectionService from '../services/connection.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const sendRequest = asyncHandler(async (req, res) => {
  const result = await connectionService.sendRequest(req.user.id, req.body.userId);
  const created = result.request.status === 'pending';
  return sendSuccess(res, {
    statusCode: created ? 201 : 200,
    message: created ? 'Connection request sent' : 'Connection request accepted',
    data: result,
  });
});

export const acceptRequest = asyncHandler(async (req, res) => {
  const result = await connectionService.acceptRequest(req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Connection request accepted', data: result });
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const result = await connectionService.rejectRequest(req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Connection request rejected', data: result });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  const result = await connectionService.cancelRequest(req.user.id, req.params.id);
  return sendSuccess(res, { message: 'Connection request cancelled', data: result });
});

export const listIncoming = asyncHandler(async (req, res) => {
  const { requests, meta } = await connectionService.listIncoming(
    req.user.id,
    req.query.page,
    req.query.limit
  );
  return sendSuccess(res, { message: 'Incoming connection requests', data: { requests }, meta });
});

export const listOutgoing = asyncHandler(async (req, res) => {
  const { requests, meta } = await connectionService.listOutgoing(
    req.user.id,
    req.query.page,
    req.query.limit
  );
  return sendSuccess(res, { message: 'Outgoing connection requests', data: { requests }, meta });
});

export const listConnections = asyncHandler(async (req, res) => {
  const { connections, meta } = await connectionService.listConnections(req.user.id, req.query);
  return sendSuccess(res, { message: 'Your connections', data: { connections }, meta });
});

export const removeConnection = asyncHandler(async (req, res) => {
  const result = await connectionService.removeConnection(req.user.id, req.params.userId);
  return sendSuccess(res, { message: 'Connection removed', data: result });
});

export const getStatus = asyncHandler(async (req, res) => {
  const relationship = await connectionService.getRelationshipPayload(
    req.user.id,
    req.params.userId
  );
  return sendSuccess(res, { message: 'Relationship status', data: { relationship } });
});

export const blockUser = asyncHandler(async (req, res) => {
  const result = await connectionService.blockUser(req.user.id, req.body.userId);
  return sendSuccess(res, { message: 'User blocked', data: result });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const result = await connectionService.unblockUser(req.user.id, req.params.userId);
  return sendSuccess(res, { message: 'User unblocked', data: result });
});

export const listBlocked = asyncHandler(async (req, res) => {
  const { blocked, meta } = await connectionService.listBlocked(
    req.user.id,
    req.query.page,
    req.query.limit
  );
  return sendSuccess(res, { message: 'Blocked users', data: { blocked }, meta });
});
