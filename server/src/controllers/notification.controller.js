import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query);
  sendSuccess(res, { statusCode: 200, message: 'Notifications retrieved', data: result });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  sendSuccess(res, { statusCode: 200, message: 'Notification marked as read', data: { notification } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, { statusCode: 200, message: 'All notifications marked as read', data: result });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  sendSuccess(res, { statusCode: 200, message: 'Unread notification count retrieved', data: result });
});
