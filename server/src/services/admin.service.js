import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import Community from '../models/community.model.js';
import Event from '../models/event.model.js';
import Report, { REPORT_STATUS } from '../models/report.model.js';
import ApiError from '../utils/ApiError.js';

export async function createReport(reporterId, data) {
  const report = await Report.create({
    ...data,
    reporter: reporterId,
  });
  return report;
}

export async function getStats() {
  const [userCount, postCount, communityCount, eventCount, pendingReportsCount, totalReportsCount] =
    await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Community.countDocuments(),
      Event.countDocuments(),
      Report.countDocuments({ status: REPORT_STATUS.PENDING }),
      Report.countDocuments(),
    ]);

  return {
    totalUsers: userCount,
    totalPosts: postCount,
    totalCommunities: communityCount,
    totalEvents: eventCount,
    pendingReports: pendingReportsCount,
    totalReports: totalReportsCount,
  };
}

export async function listReports({ status = 'pending', page = 1, limit = 20 } = {}) {
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'name username avatar')
      .populate('reviewedBy', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Report.countDocuments(query),
  ]);

  return {
    reports,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit) || 1,
    },
  };
}

export async function resolveReport(adminId, reportId, { status = REPORT_STATUS.RESOLVED, resolutionNotes = '' } = {}) {
  const report = await Report.findById(reportId);
  if (!report) {
    throw ApiError.notFound('Report not found');
  }

  report.status = status;
  report.reviewedBy = adminId;
  report.resolutionNotes = resolutionNotes;
  await report.save();

  return report;
}

export async function listUsers({ search = '', role = '', page = 1, limit = 20 } = {}) {
  const query = {};
  if (search.trim()) {
    const rx = new RegExp(search.trim(), 'i');
    query.$or = [{ name: rx }, { username: rx }, { email: rx }];
  }
  if (role && role !== 'all') {
    query.role = role;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [users, total] = await Promise.all([
    User.find(query)
      .select('name username email role isActive isBanned createdAt avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit) || 1,
    },
  };
}

export async function setUserRole(adminId, userId, newRole) {
  if (String(adminId) === String(userId)) {
    throw ApiError.badRequest('You cannot modify your own admin role');
  }

  if (!['user', 'moderator', 'admin'].includes(newRole)) {
    throw ApiError.badRequest('Invalid role');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role: newRole },
    { new: true }
  ).select('name username role email');

  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function setUserBanStatus(adminId, userId, { isBanned }) {
  if (String(adminId) === String(userId)) {
    throw ApiError.badRequest('You cannot ban your own admin account');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { isBanned: Boolean(isBanned) },
    { new: true }
  ).select('name username isBanned email');

  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export default {
  createReport,
  getStats,
  listReports,
  resolveReport,
  listUsers,
  setUserRole,
  setUserBanStatus,
};
