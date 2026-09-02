import { Router } from 'express';
import * as profileController from '../controllers/profile.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  checkUsernameParamSchema,
  patchInterestsSchema,
  patchSkillsSchema,
  updateProfileSchema,
  usernameParamSchema,
} from '../validators/profile.validator.js';

const router = Router();

/**
 * @openapi
 * /users/me/profile:
 *   get:
 *     summary: Get the signed-in user's full profile
 *     tags: [Profiles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Owner profile, including completeness and embedding source }
 *       401: { description: Authentication required }
 */
router.get('/me/profile', requireAuth, profileController.getMe);

/**
 * @openapi
 * /users/me/profile:
 *   put:
 *     summary: Replace profile fields on the signed-in user
 *     description: Only supplied fields are updated. `displayName` maps to stored `name`. Image fields accept `{ url }` now; `publicId` is reserved for Cloudinary.
 *     tags: [Profiles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName: { type: string }
 *               username: { type: string }
 *               bio: { type: string }
 *               occupation: { type: string }
 *               profileVisibility: { type: string, enum: [public, private] }
 *               profileImage: { type: object, properties: { url: { type: string, format: uri } } }
 *               coverImage: { type: object, properties: { url: { type: string, format: uri } } }
 *               location: { type: object, properties: { city: { type: string }, country: { type: string } } }
 *               skills: { type: array, items: { type: string } }
 *               interests: { type: array, items: { type: string } }
 *     responses:
 *       200: { description: Updated profile }
 *       400: { description: Validation failed }
 *       401: { description: Authentication required }
 *       409: { description: Username already taken }
 */
router.put('/me/profile', requireAuth, validate(updateProfileSchema), profileController.updateMe);

/**
 * @openapi
 * /users/me/skills:
 *   patch:
 *     summary: Replace the signed-in user's skills list
 *     tags: [Profiles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skills]
 *             properties:
 *               skills: { type: array, items: { type: string }, maxItems: 20 }
 *     responses:
 *       200: { description: Skills replaced }
 *       401: { description: Authentication required }
 */
router.patch('/me/skills', requireAuth, validate(patchSkillsSchema), profileController.patchSkills);

/**
 * @openapi
 * /users/me/interests:
 *   patch:
 *     summary: Replace the signed-in user's interests list
 *     tags: [Profiles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [interests]
 *             properties:
 *               interests: { type: array, items: { type: string }, maxItems: 20 }
 */
router.patch(
  '/me/interests',
  requireAuth,
  validate(patchInterestsSchema),
  profileController.patchInterests
);

/**
 * @openapi
 * /users/me/profile-completeness:
 *   get:
 *     summary: Score how complete the signed-in profile is
 *     tags: [Profiles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Weighted percentage, missing fields, and a preview of the embedding source text
 */
router.get('/me/profile-completeness', requireAuth, profileController.getCompleteness);

/**
 * @openapi
 * /users/check-username/{username}:
 *   get:
 *     summary: Check whether a username can be claimed
 *     description: Returns available=true for an unused name, and also for the caller's current username. Reserved names are reported as unavailable.
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Availability payload }
 */
router.get(
  '/check-username/:username',
  optionalAuth,
  validate(checkUsernameParamSchema),
  profileController.checkUsername
);

/**
 * @openapi
 * /users/{username}:
 *   get:
 *     summary: Get a public profile by username
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Public profile }
 *       403: { description: Profile is private }
 *       404: { description: User not found }
 */
router.get(
  '/:username',
  optionalAuth,
  validate(usernameParamSchema),
  profileController.getByUsername
);

export default router;
