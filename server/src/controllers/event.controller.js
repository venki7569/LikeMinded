import * as eventService from '../services/event.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.user.id, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Event created', data: { event } });
});

export const listEvents = asyncHandler(async (req, res) => {
  const result = await eventService.listEvents(req.query);
  sendSuccess(res, { statusCode: 200, message: 'Events retrieved', data: result });
});

export const getEvent = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  sendSuccess(res, { statusCode: 200, message: 'Event retrieved', data: { event } });
});

export const toggleRsvp = asyncHandler(async (req, res) => {
  const result = await eventService.toggleRsvp(req.user.id, req.params.id);
  sendSuccess(res, {
    statusCode: 200,
    message: result.isRsvp ? 'RSVP confirmed' : 'RSVP cancelled',
    data: result,
  });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const result = await eventService.deleteEvent(req.user.id, req.params.id);
  sendSuccess(res, { statusCode: 200, message: 'Event deleted', data: result });
});
