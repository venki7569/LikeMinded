import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import connectionRoutes from './connections.routes.js';
import peopleRoutes from './people.routes.js';
import communityRoutes from './communities.routes.js';
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

export default router;
