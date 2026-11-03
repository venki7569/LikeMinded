import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /reports:
 *   post:
 *     summary: Submit a moderation report
 *     tags: [Moderation]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetType, targetId, reason]
 *             properties:
 *               targetType: { type: string, enum: [post, comment, user, community] }
 *               targetId: { type: string }
 *               reason: { type: string, enum: [spam, harassment, hate_speech, misinformation, other] }
 *               description: { type: string }
 *     responses:
 *       201: { description: Report filed }
 */
router.post('/', requireAuth, adminController.submitReport);

export default router;
