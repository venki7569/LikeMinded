import { Router } from 'express';
import * as postController from '../controllers/post.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  commentCreateSchema,
  commentIdParamSchema,
  commentListQuerySchema,
  commentUpdateSchema,
  createPostSchema,
  feedQuerySchema,
  postIdParamSchema,
  updatePostSchema,
} from '../validators/post.validator.js';

const router = Router();

/**
 * @openapi
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Creates a text or image post, optionally in a community. Author is always taken from the authenticated session. Hashtags and mentions are extracted server-side.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *               media:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: object
 *                   properties:
 *                     url: { type: string, format: uri }
 *                     publicId: { type: string }
 *               privacy:
 *                 type: string
 *                 enum: [public, connections, private]
 *               communityId:
 *                 type: string
 *                 description: Optional community ObjectId
 *     responses:
 *       201: { description: Post created }
 *       400: { description: Validation failed }
 *       401: { description: Authentication required }
 *       403: { description: Not a community member }
 */
router.post('/', requireAuth, validate(createPostSchema), postController.createPost);

/**
 * @openapi
 * /posts/feed:
 *   get:
 *     summary: Get the authenticated user's home feed
 *     description: Returns posts from self and accepted connections, excluding private posts from others. Cursor-paginated.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: Last seen post _id for cursor pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated feed }
 *       401: { description: Authentication required }
 */
router.get('/feed', requireAuth, validate(feedQuerySchema), postController.getHomeFeed);

/**
 * @openapi
 * /posts/{postId}:
 *   get:
 *     summary: Get a single post by ID
 *     description: Returns 404 for posts the caller cannot see (privacy enforcement, blocked users).
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Post }
 *       404: { description: Post not found or not visible }
 */
router.get('/:postId', optionalAuth, validate(postIdParamSchema), postController.getPost);

/**
 * @openapi
 * /posts/{postId}:
 *   put:
 *     summary: Update a post
 *     description: Only the author may edit their own post. Hashtags and mentions are re-extracted from new content.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               media: { type: array, items: { type: object } }
 *               privacy: { type: string, enum: [public, connections, private] }
 *     responses:
 *       200: { description: Post updated }
 *       403: { description: Not the post author }
 *       404: { description: Post not found }
 */
router.put('/:postId', requireAuth, validate(updatePostSchema), postController.updatePost);

/**
 * @openapi
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     description: Author or admin may delete. Cascades to likes and comments.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Post deleted }
 *       403: { description: Not authorized }
 *       404: { description: Post not found }
 */
router.delete('/:postId', requireAuth, validate(postIdParamSchema), postController.deletePost);

/**
 * @openapi
 * /posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Increments likeCount. Returns 409 if already liked.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Post liked }
 *       409: { description: Already liked }
 */
router.post('/:postId/like', requireAuth, validate(postIdParamSchema), postController.likePost);

/**
 * @openapi
 * /posts/{postId}/like:
 *   delete:
 *     summary: Unlike a post
 *     description: Decrements likeCount. Returns 409 if not liked.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Post unliked }
 *       409: { description: Not liked }
 */
router.delete('/:postId/like', requireAuth, validate(postIdParamSchema), postController.unlikePost);

/**
 * @openapi
 * /posts/{postId}/comments:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, maxLength: 2000 }
 *     responses:
 *       201: { description: Comment created }
 *       404: { description: Post not found }
 */
router.post(
  '/:postId/comments',
  requireAuth,
  validate(commentCreateSchema),
  postController.createComment
);

/**
 * @openapi
 * /posts/{postId}/comments:
 *   get:
 *     summary: List comments on a post (offset-paginated)
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200: { description: Paginated comments }
 *       404: { description: Post not found }
 */
router.get(
  '/:postId/comments',
  optionalAuth,
  validate(commentListQuerySchema),
  postController.listComments
);

/**
 * @openapi
 * /posts/{postId}/comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     description: Only the comment author may edit.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200: { description: Comment updated }
 *       403: { description: Not the comment author }
 *       404: { description: Comment not found }
 */
router.put(
  '/:postId/comments/:commentId',
  requireAuth,
  validate(commentUpdateSchema),
  postController.updateComment
);

/**
 * @openapi
 * /posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Comment author, post author, or admin may delete.
 *     tags: [Posts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Comment deleted }
 *       403: { description: Not authorized }
 *       404: { description: Comment not found }
 */
router.delete(
  '/:postId/comments/:commentId',
  requireAuth,
  validate(commentIdParamSchema),
  postController.deleteComment
);

export default router;
