import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';

const router = Router();

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Get overall platform statistics
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Statistics }
 */
router.get('/stats', requireAuth, requireAdmin, adminController.getStats);

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: List moderation reports
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, default: pending }
 *     responses:
 *       200: { description: Reports list }
 */
router.get('/reports', requireAuth, requireAdmin, adminController.getReports);

/**
 * @openapi
 * /admin/reports/{id}:
 *   patch:
 *     summary: Resolve or dismiss moderation report
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Report updated }
 */
router.patch('/reports/:id', requireAuth, requireAdmin, adminController.resolveReport);

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List platform users with search and filter
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Users list }
 */
router.get('/users', requireAuth, requireAdmin, adminController.getUsers);

/**
 * @openapi
 * /admin/users/{userId}/role:
 *   patch:
 *     summary: Update user role (user, moderator, admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Role updated }
 */
router.patch('/users/:userId/role', requireAuth, requireAdmin, adminController.updateUserRole);

/**
 * @openapi
 * /admin/users/{userId}/ban:
 *   patch:
 *     summary: Ban or unban user
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User ban status updated }
 */
router.patch('/users/:userId/ban', requireAuth, requireAdmin, adminController.updateUserBan);

export default router;
