import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /conversations:
 *   get:
 *     summary: List all user conversations
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of conversations }
 *   post:
 *     summary: Start or get direct conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recipientId]
 *             properties:
 *               recipientId: { type: string }
 *     responses:
 *       201: { description: Conversation started or retrieved }
 */
router.get('/', requireAuth, chatController.getConversations);
router.post('/', requireAuth, chatController.startConversation);

/**
 * @openapi
 * /conversations/{id}/messages:
 *   get:
 *     summary: Get messages in a conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Messages list }
 *   post:
 *     summary: Send message to conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [body]
 *             properties:
 *               body: { type: string }
 *               attachments: { type: array }
 *     responses:
 *       201: { description: Message sent }
 */
router.get('/:id/messages', requireAuth, chatController.getMessages);
router.post('/:id/messages', requireAuth, chatController.sendMessage);

/**
 * @openapi
 * /conversations/{id}/read:
 *   patch:
 *     summary: Mark messages in conversation as read
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversation read }
 */
router.patch('/:id/read', requireAuth, chatController.markRead);

export default router;
