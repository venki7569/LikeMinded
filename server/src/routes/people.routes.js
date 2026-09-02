import { Router } from 'express';
import * as peopleController from '../controllers/people.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { peopleQuerySchema } from '../validators/connection.validator.js';

const router = Router();

/**
 * @openapi
 * /people:
 *   get:
 *     summary: Discover people by name, username, skills, interests, occupation, or location
 *     description: |
 *       MongoDB filtering only — no AI ranking yet. Each item includes
 *       `user`, `relationshipStatus`, `mutualConnectionCount`, and shared
 *       skill/interest counts so a later `matchScore` can be added without
 *       changing the response shape.
 *
 *       Excludes the caller, inactive/banned accounts, either side of a block,
 *       and private profiles unless the caller is already connected.
 *       Public cards never include email.
 *     tags: [People]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Case-insensitive name or username search
 *       - in: query
 *         name: skill
 *         schema: { type: string }
 *       - in: query
 *         name: skills
 *         schema: { type: string }
 *         description: Comma-separated skills; user must have all of them
 *       - in: query
 *         name: interest
 *         schema: { type: string }
 *       - in: query
 *         name: interests
 *         schema: { type: string }
 *       - in: query
 *         name: occupation
 *         schema: { type: string }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated people cards }
 *       401: { description: Authentication required }
 */
router.get('/', requireAuth, validate(peopleQuerySchema), peopleController.discover);

export default router;
