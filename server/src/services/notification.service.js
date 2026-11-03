import Notification, { NOTIFICATION_TYPES } from '../models/notification.model.js';
import domainEvents, {
  COMMUNITY_EVENTS,
  CONNECTION_EVENTS,
  POST_EVENTS,
} from '../events/domainEvents.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export async function createNotification(data) {
  // Never notify self of own action
  if (data.recipient && data.actor && String(data.recipient) === String(data.actor)) {
    return null;
  }

  try {
    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    logger.error('Failed to create notification', { error: error.message });
    return null;
  }
}

export async function listNotifications(userId, { page = 1, limit = 20, isRead } = {}) {
  const query = { recipient: userId };
  if (typeof isRead === 'boolean') {
    query.isRead = isRead;
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [items, total] = await Promise.all([
    Notification.find(query)
      .populate('actor', 'name username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Notification.countDocuments(query),
  ]);

  return {
    notifications: items,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit) || 1,
    },
  };
}

export async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  return notification;
}

export async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return { modifiedCount: result.modifiedCount };
}

export async function getUnreadCount(userId) {
  const count = await Notification.countDocuments({ recipient: userId, isRead: false });
  return { unreadCount: count };
}

// Domain Event Listeners
export function initNotificationEventListeners() {
  domainEvents.on(CONNECTION_EVENTS.REQUEST_RECEIVED, async ({ senderId, receiverId, senderName }) => {
    await createNotification({
      recipient: receiverId,
      actor: senderId,
      type: NOTIFICATION_TYPES.CONNECTION_REQUEST,
      entityId: senderId,
      entityModel: 'User',
      title: 'New Connection Request',
      message: `${senderName || 'Someone'} sent you a connection request.`,
    });
  });

  domainEvents.on(CONNECTION_EVENTS.REQUEST_ACCEPTED, async ({ senderId, receiverId, receiverName }) => {
    await createNotification({
      recipient: senderId,
      actor: receiverId,
      type: NOTIFICATION_TYPES.CONNECTION_ACCEPTED,
      entityId: receiverId,
      entityModel: 'User',
      title: 'Connection Accepted',
      message: `${receiverName || 'Someone'} accepted your connection request.`,
    });
  });

  domainEvents.on(POST_EVENTS.POST_LIKED, async ({ postId, authorId, userId, userName }) => {
    await createNotification({
      recipient: authorId,
      actor: userId,
      type: NOTIFICATION_TYPES.POST_LIKE,
      entityId: postId,
      entityModel: 'Post',
      title: 'Post Liked',
      message: `${userName || 'Someone'} liked your post.`,
    });
  });

  domainEvents.on(POST_EVENTS.COMMENT_CREATED, async ({ postId, authorId, userId, userName }) => {
    await createNotification({
      recipient: authorId,
      actor: userId,
      type: NOTIFICATION_TYPES.POST_COMMENT,
      entityId: postId,
      entityModel: 'Post',
      title: 'New Comment',
      message: `${userName || 'Someone'} commented on your post.`,
    });
  });

  domainEvents.on(COMMUNITY_EVENTS.INVITATION_CREATED, async ({ inviteeId, inviterId, communityName, communitySlug }) => {
    await createNotification({
      recipient: inviteeId,
      actor: inviterId,
      type: NOTIFICATION_TYPES.COMMUNITY_INVITE,
      entityId: null,
      entityModel: 'Community',
      title: 'Community Invitation',
      message: `You were invited to join ${communityName || 'a community'}.`,
    });
  });

  domainEvents.on(COMMUNITY_EVENTS.JOIN_REQUEST_APPROVED, async ({ userId, communityName }) => {
    await createNotification({
      recipient: userId,
      type: NOTIFICATION_TYPES.COMMUNITY_APPROVED,
      entityId: null,
      entityModel: 'Community',
      title: 'Join Request Approved',
      message: `Your request to join ${communityName || 'the community'} was approved!`,
    });
  });
}

// Auto-initialize listeners
initNotificationEventListeners();

export default {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
