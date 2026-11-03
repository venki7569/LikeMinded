import { Router } from 'express';
import * as searchService from '../services/search.service.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/**
 * @openapi
 * /search:
 *   get:
 *     summary: Global multi-entity search
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [all, users, communities, posts, events], default: all }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Aggregated search results }
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const results = await searchService.searchAll(req.query.q, req.query);
    sendSuccess(res, { statusCode: 200, message: 'Search results', data: results });
  })
);

export default router;
