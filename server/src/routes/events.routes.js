import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * @openapi
 * /events:
 *   post:
 *     summary: Create an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, startsAt]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               startsAt: { type: string, format: date-time }
 *               endsAt: { type: string, format: date-time }
 *               location: { type: string }
 *               capacity: { type: integer }
 *     responses:
 *       201: { description: Event created }
 *   get:
 *     summary: Discover events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: upcoming
 *         schema: { type: string, default: 'true' }
 *     responses:
 *       200: { description: List of events }
 */
router.post('/', requireAuth, eventController.createEvent);
router.get('/', optionalAuth, eventController.listEvents);

/**
 * @openapi
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Event details }
 *   delete:
 *     summary: Delete event (host only)
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Event deleted }
 */
router.get('/:id', optionalAuth, eventController.getEvent);
router.delete('/:id', requireAuth, eventController.deleteEvent);

/**
 * @openapi
 * /events/{id}/rsvp:
 *   post:
 *     summary: Toggle RSVP for an event
 *     tags: [Events]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: RSVP toggled }
 */
router.post('/:id/rsvp', requireAuth, eventController.toggleRsvp);

export default router;
