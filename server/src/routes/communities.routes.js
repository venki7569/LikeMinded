import { Router } from 'express';
import * as communityController from '../controllers/community.controller.js';
import * as postController from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCommunitySchema,
  invitationCreateSchema,
  invitationIdParamSchema,
  listCommunitiesQuerySchema,
  listJoinRequestsQuerySchema,
  listMembersQuerySchema,
  memberParamSchema,
  paginationQuerySchema,
  requestIdParamSchema,
  slugParamSchema,
  transferOwnershipSchema,
  updateCommunitySchema,
} from '../validators/community.validator.js';
import { communityPostsQuerySchema } from '../validators/post.validator.js';

const router = Router();

/**
 * @openapi
 * /communities:
 *   get:
 *     summary: Discover communities
 *     description: Public communities are listed for everyone. Private communities appear only if the caller is a member. Mongo filtering only — no AI ranking.
 *     tags: [Communities]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: interest
 *         schema: { type: string }
 *       - in: query
 *         name: privacy
 *         schema: { type: string, enum: [public, private] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, members] }
 *       - in: query
 *         name: mine
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated community cards }
 */
router.get('/', optionalAuth, validate(listCommunitiesQuerySchema), communityController.list);

/**
 * @openapi
 * /communities:
 *   post:
 *     summary: Create a community
 *     description: The caller becomes owner and the first member. Slug is generated from the name and kept stable afterwards.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               interests: { type: array, items: { type: string } }
 *               privacy: { type: string, enum: [public, private] }
 *               avatar: { type: object, properties: { url: { type: string } } }
 *               coverImage: { type: object, properties: { url: { type: string } } }
 *     responses:
 *       201: { description: Community created }
 *       401: { description: Authentication required }
 */
router.post('/', requireAuth, validate(createCommunitySchema), communityController.create);

/**
 * @openapi
 * /communities/invitations:
 *   get:
 *     summary: List pending invitations for the current user
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated invitations }
 *       401: { description: Authentication required }
 */
router.get(
  '/invitations',
  requireAuth,
  validate(paginationQuerySchema),
  communityController.listMyInvitations
);

/**
 * @openapi
 * /communities/invitations/{invitationId}/accept:
 *   post:
 *     summary: Accept a community invitation
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Membership created }
 *       403: { description: Invitation is not for the caller }
 */
router.post(
  '/invitations/:invitationId/accept',
  requireAuth,
  validate(invitationIdParamSchema),
  communityController.acceptInvitation
);

/**
 * @openapi
 * /communities/invitations/{invitationId}/reject:
 *   post:
 *     summary: Decline a community invitation
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema: { type: string }
 */
router.post(
  '/invitations/:invitationId/reject',
  requireAuth,
  validate(invitationIdParamSchema),
  communityController.rejectInvitation
);

/**
 * @openapi
 * /communities/{slug}:
 *   get:
 *     summary: Get a community by slug
 *     description: Private communities hide owner details from non-members. `community.viewer` describes the caller's membership and permissions.
 *     tags: [Communities]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Community }
 *       404: { description: Not found }
 */
router.get('/:slug', optionalAuth, validate(slugParamSchema), communityController.getBySlug);

/**
 * @openapi
 * /communities/{slug}:
 *   put:
 *     summary: Update community settings
 *     description: Moderators may edit profile fields. Only the owner may change privacy. Slug is never rewritten, so existing links stay valid.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.put(
  '/:slug',
  requireAuth,
  validate(updateCommunitySchema),
  communityController.update
);

/**
 * @openapi
 * /communities/{slug}:
 *   delete:
 *     summary: Delete a community
 *     description: Owner only. Memberships, join requests and invitations are removed with the community.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:slug', requireAuth, validate(slugParamSchema), communityController.remove);

/**
 * @openapi
 * /communities/{slug}/join:
 *   post:
 *     summary: Join a public community or request to join a private one
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Joined or pending request created }
 *       409: { description: Already a member or request pending }
 */
router.post('/:slug/join', requireAuth, validate(slugParamSchema), communityController.join);

/**
 * @openapi
 * /communities/{slug}/leave:
 *   post:
 *     summary: Leave a community
 *     description: The owner must transfer ownership first.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:slug/leave', requireAuth, validate(slugParamSchema), communityController.leave);

/**
 * @openapi
 * /communities/{slug}/join-requests:
 *   get:
 *     summary: List join requests
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:slug/join-requests',
  requireAuth,
  validate(listJoinRequestsQuerySchema),
  communityController.listJoinRequests
);

/**
 * @openapi
 * /communities/{slug}/join-requests/{requestId}/approve:
 *   post:
 *     summary: Approve a pending join request
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/join-requests/:requestId/approve',
  requireAuth,
  validate(requestIdParamSchema),
  communityController.approveJoinRequest
);

/**
 * @openapi
 * /communities/{slug}/join-requests/{requestId}/reject:
 *   post:
 *     summary: Reject a pending join request
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/join-requests/:requestId/reject',
  requireAuth,
  validate(requestIdParamSchema),
  communityController.rejectJoinRequest
);

/**
 * @openapi
 * /communities/{slug}/join-requests/{requestId}/cancel:
 *   post:
 *     summary: Cancel your own pending join request
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/join-requests/:requestId/cancel',
  requireAuth,
  validate(requestIdParamSchema),
  communityController.cancelJoinRequest
);

/**
 * @openapi
 * /communities/{slug}/members:
 *   get:
 *     summary: List members
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:slug/members',
  requireAuth,
  validate(listMembersQuerySchema),
  communityController.listMembers
);

/**
 * @openapi
 * /communities/{slug}/members/{userId}:
 *   delete:
 *     summary: Remove a member
 *     description: Owner can remove members and moderators. Moderators can remove regular members only. The owner cannot be removed.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:slug/members/:userId',
  requireAuth,
  validate(memberParamSchema),
  communityController.removeMember
);

/**
 * @openapi
 * /communities/{slug}/moderators/{userId}:
 *   post:
 *     summary: Promote a member to moderator
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/moderators/:userId',
  requireAuth,
  validate(memberParamSchema),
  communityController.promoteModerator
);

/**
 * @openapi
 * /communities/{slug}/moderators/{userId}:
 *   delete:
 *     summary: Demote a moderator to member
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:slug/moderators/:userId',
  requireAuth,
  validate(memberParamSchema),
  communityController.demoteModerator
);

/**
 * @openapi
 * /communities/{slug}/transfer-ownership:
 *   post:
 *     summary: Transfer ownership to another member
 *     description: The previous owner becomes a moderator. The target must already be a member.
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/transfer-ownership',
  requireAuth,
  validate(transferOwnershipSchema),
  communityController.transferOwnership
);

/**
 * @openapi
 * /communities/{slug}/invitations:
 *   post:
 *     summary: Invite a user to the community
 *     tags: [Communities]
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:slug/invitations',
  requireAuth,
  validate(invitationCreateSchema),
  communityController.createInvitation
);

/**
 * @openapi
 * /communities/{slug}/posts:
 *   get:
 *     summary: Get posts in a community (community feed)
 *     description: Returns cursor-paginated posts for the given community. Private communities require membership.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated community feed }
 *       404: { description: Community not found or not visible }
 */
router.get(
  '/:slug/posts',
  optionalAuth,
  validate(communityPostsQuerySchema),
  postController.getCommunityFeed
);

export default router;
