import Event from '../models/event.model.js';
import ApiError from '../utils/ApiError.js';

export async function createEvent(userId, data) {
  const event = await Event.create({
    ...data,
    host: userId,
    attendees: [userId],
  });

  return Event.findById(event._id)
    .populate('host', 'name username avatar')
    .populate('community', 'name slug avatar')
    .lean();
}

export async function listEvents({ category, upcoming = 'true', page = 1, limit = 20 } = {}) {
  const query = {};

  if (category && category !== 'all') {
    query.category = category;
  }

  if (upcoming === 'true') {
    query.startsAt = { $gte: new Date() };
  }

  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const numericLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (numericPage - 1) * numericLimit;

  const [items, total] = await Promise.all([
    Event.find(query)
      .populate('host', 'name username avatar')
      .populate('community', 'name slug avatar')
      .populate('attendees', 'name username avatar')
      .sort({ startsAt: 1 })
      .skip(skip)
      .limit(numericLimit)
      .lean(),
    Event.countDocuments(query),
  ]);

  return {
    events: items,
    pagination: {
      page: numericPage,
      limit: numericLimit,
      total,
      pages: Math.ceil(total / numericLimit) || 1,
    },
  };
}

export async function getEventById(eventId) {
  const event = await Event.findById(eventId)
    .populate('host', 'name username avatar')
    .populate('community', 'name slug avatar')
    .populate('attendees', 'name username avatar')
    .lean();

  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  return event;
}

export async function toggleRsvp(userId, eventId) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const userIndex = event.attendees.findIndex((id) => String(id) === String(userId));
  let isRsvp = false;

  if (userIndex >= 0) {
    // Cannot un-rsvp if user is host
    if (String(event.host) === String(userId)) {
      throw ApiError.badRequest('Host cannot leave the event');
    }
    event.attendees.splice(userIndex, 1);
    isRsvp = false;
  } else {
    if (event.capacity && event.attendees.length >= event.capacity) {
      throw ApiError.badRequest('Event has reached maximum capacity');
    }
    event.attendees.push(userId);
    isRsvp = true;
  }

  await event.save();

  return {
    isRsvp,
    attendeeCount: event.attendees.length,
  };
}

export async function deleteEvent(userId, eventId) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  if (String(event.host) !== String(userId)) {
    throw ApiError.forbidden('Only the event host can delete this event');
  }

  await Event.deleteOne({ _id: eventId });
  return { success: true };
}

export default {
  createEvent,
  listEvents,
  getEventById,
  toggleRsvp,
  deleteEvent,
};
