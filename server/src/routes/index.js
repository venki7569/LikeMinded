import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import connectionRoutes from './connections.routes.js';
import peopleRoutes from './people.routes.js';
import communityRoutes from './communities.routes.js';
import postRoutes from './posts.routes.js';
import notificationRoutes from './notifications.routes.js';
import chatRoutes from './chat.routes.js';
import eventRoutes from './events.routes.js';
import matchingRoutes from './matching.routes.js';
import searchRoutes from './search.routes.js';
import adminRoutes from './admin.routes.js';
import reportRoutes from './reports.routes.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness and dependency check
 *     tags: [System]
 *     responses:
 *       200: { description: Service is up }
 */
router.get('/health', (_req, res) =>
  sendSuccess(res, {
    message: 'LikeMinded API is healthy',
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      database: MONGO_STATES[mongoose.connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    },
  })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/connections', connectionRoutes);
router.use('/people', peopleRoutes);
router.use('/communities', communityRoutes);
router.use('/posts', postRoutes);
router.use('/notifications', notificationRoutes);
router.use('/conversations', chatRoutes);
router.use('/events', eventRoutes);
router.use('/matching', matchingRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

export default router;
