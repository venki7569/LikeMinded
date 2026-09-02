import { Router } from 'express';
import * as connectionController from '../controllers/connection.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  blockUserSchema,
  listConnectionsQuerySchema,
  paginationQuerySchema,
  requestIdParamSchema,
  sendRequestSchema,
  userIdParamSchema,
} from '../validators/connection.validator.js';

const router = Router();

/**
 * @openapi
 * /connections/requests:
 *   post:
 *     summary: Send a connection request
 *     description: |
 *       Creates a pending request to `userId`. Sending to someone who already has a
 *       pending request toward you accepts theirs instead. Duplicate pending requests
 *       and already-connected pairs are rejected. Blocked pairs cannot interact.
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, description: Target user's ObjectId }
 *     responses:
 *       201: { description: Request created }
 *       200: { description: Reciprocal pending request was accepted }
 *       400: { description: Self-request or invalid id }
 *       401: { description: Authentication required }
 *       403: { description: Blocked or not allowed }
 *       409: { description: Duplicate request or already connected }
 */
router.post(
  '/requests',
  requireAuth,
  validate(sendRequestSchema),
  connectionController.sendRequest
);

/**
 * @openapi
 * /connections/requests/incoming:
 *   get:
 *     summary: List incoming pending requests
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated incoming requests }
 *       401: { description: Authentication required }
 */
router.get(
  '/requests/incoming',
  requireAuth,
  validate(paginationQuerySchema),
  connectionController.listIncoming
);

/**
 * @openapi
 * /connections/requests/outgoing:
 *   get:
 *     summary: List outgoing pending requests
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated outgoing requests }
 *       401: { description: Authentication required }
 */
router.get(
  '/requests/outgoing',
  requireAuth,
  validate(paginationQuerySchema),
  connectionController.listOutgoing
);

/**
 * @openapi
 * /connections/requests/{id}/accept:
 *   post:
 *     summary: Accept an incoming connection request
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request accepted; an undirected Connection row is created }
 *       401: { description: Authentication required }
 *       403: { description: Only the receiver may accept }
 *       404: { description: Request not found }
 */
router.post(
  '/requests/:id/accept',
  requireAuth,
  validate(requestIdParamSchema),
  connectionController.acceptRequest
);

/**
 * @openapi
 * /connections/requests/{id}/reject:
 *   post:
 *     summary: Reject an incoming connection request
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request rejected }
 *       403: { description: Only the receiver may reject }
 */
router.post(
  '/requests/:id/reject',
  requireAuth,
  validate(requestIdParamSchema),
  connectionController.rejectRequest
);

/**
 * @openapi
 * /connections/requests/{id}/cancel:
 *   post:
 *     summary: Cancel an outgoing connection request
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request cancelled }
 *       403: { description: Only the sender may cancel }
 */
router.post(
  '/requests/:id/cancel',
  requireAuth,
  validate(requestIdParamSchema),
  connectionController.cancelRequest
);

/**
 * @openapi
 * /connections/status/{userId}:
 *   get:
 *     summary: Relationship between the caller and another user
 *     description: |
 *       `status` is one of `none`, `outgoing_pending`, `incoming_pending`,
 *       `connected`, `blocked`. `blocked` is only returned when the caller blocked
 *       the other user. If they blocked the caller, the status is `none` so the
 *       block is not leaked.
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Relationship payload including mutualConnectionCount }
 *       401: { description: Authentication required }
 *       404: { description: User not found }
 */
router.get(
  '/status/:userId',
  requireAuth,
  validate(userIdParamSchema),
  connectionController.getStatus
);

/**
 * @openapi
 * /connections/blocks:
 *   get:
 *     summary: List users the caller has blocked
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated blocked users }
 *       401: { description: Authentication required }
 */
router.get(
  '/blocks',
  requireAuth,
  validate(paginationQuerySchema),
  connectionController.listBlocked
);

/**
 * @openapi
 * /connections/blocks:
 *   post:
 *     summary: Block a user
 *     description: |
 *       Cancels any pending request between the pair and soft-ends an active
 *       connection (`endedReason=blocked`). Historical rows are kept. Either
 *       direction of a block prevents new requests.
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: User blocked }
 *       400: { description: Self-block }
 *       401: { description: Authentication required }
 *       409: { description: Already blocked }
 */
router.post('/blocks', requireAuth, validate(blockUserSchema), connectionController.blockUser);

/**
 * @openapi
 * /connections/blocks/{userId}:
 *   delete:
 *     summary: Unblock a user the caller previously blocked
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User unblocked }
 *       401: { description: Authentication required }
 *       403: { description: Cannot unblock on someone else's behalf }
 *       404: { description: This user is not blocked }
 */
router.delete(
  '/blocks/:userId',
  requireAuth,
  validate(userIdParamSchema),
  connectionController.unblockUser
);

/**
 * @openapi
 * /connections:
 *   get:
 *     summary: List accepted connections
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Filter by name, username, or occupation
 *     responses:
 *       200: { description: Paginated connections }
 *       401: { description: Authentication required }
 */
router.get(
  '/',
  requireAuth,
  validate(listConnectionsQuerySchema),
  connectionController.listConnections
);

/**
 * @openapi
 * /connections/{userId}:
 *   delete:
 *     summary: Remove an accepted connection
 *     description: Soft-ends the undirected Connection (`endedReason=removed`). Either participant may call this.
 *     tags: [Connections]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Connection removed }
 *       401: { description: Authentication required }
 *       404: { description: Not connected }
 */
router.delete(
  '/:userId',
  requireAuth,
  validate(userIdParamSchema),
  connectionController.removeConnection
);

export default router;
