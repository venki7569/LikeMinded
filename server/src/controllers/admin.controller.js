import * as adminService from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const submitReport = asyncHandler(async (req, res) => {
  const report = await adminService.createReport(req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Report submitted successfully', data: { report } });
});

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await adminService.getStats();
  sendSuccess(res, { statusCode: 200, message: 'Admin platform stats', data: { stats } });
});

export const getReports = asyncHandler(async (req, res) => {
  const result = await adminService.listReports(req.query);
  sendSuccess(res, { statusCode: 200, message: 'Moderation reports', data: result });
});

export const resolveReport = asyncHandler(async (req, res) => {
  const report = await adminService.resolveReport(req.user.id, req.params.id, req.body);
  sendSuccess(res, { statusCode: 200, message: 'Report resolved', data: { report } });
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsers(req.query);
  sendSuccess(res, { statusCode: 200, message: 'Users list', data: result });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await adminService.setUserRole(req.user.id, req.params.userId, req.body.role);
  sendSuccess(res, { statusCode: 200, message: 'User role updated', data: { user } });
});

export const updateUserBan = asyncHandler(async (req, res) => {
  const user = await adminService.setUserBanStatus(req.user.id, req.params.userId, req.body);
  sendSuccess(res, {
    statusCode: 200,
    message: user.isBanned ? 'User banned' : 'User unbanned',
    data: { user },
  });
});
