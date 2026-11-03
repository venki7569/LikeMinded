import { Router } from 'express';
import * as matchingController from '../controllers/matching.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /matching/recommendations:
 *   get:
 *     summary: Get AI recommended profile matches
 *     tags: [AI Matching]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Recommended user matches with explainable scores }
 */
router.get('/recommendations', requireAuth, matchingController.getRecommendations);

/**
 * @openapi
 * /matching/explain/{userId}:
 *   get:
 *     summary: Get detailed explanation for match with a specific user
 *     tags: [AI Matching]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Explanation breakdown }
 */
router.get('/explain/:userId', requireAuth, matchingController.explainMatch);

export default router;
