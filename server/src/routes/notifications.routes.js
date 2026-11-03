import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Get notifications for the current user
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: List of notifications }
 */
router.get('/', requireAuth, notificationController.getNotifications);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', requireAuth, notificationController.getUnreadCount);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Modified count }
 */
router.patch('/read-all', requireAuth, notificationController.markAllRead);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 */
router.patch('/:id/read', requireAuth, notificationController.markRead);

export default router;
