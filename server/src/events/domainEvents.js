import { EventEmitter } from 'node:events';
import logger from '../config/logger.js';

/**
 * In-process domain events. Phase 7 (notifications / Socket.IO) will subscribe
 * here — nothing is broadcast yet, so there is no extra infrastructure.
 */
export const CONNECTION_EVENTS = Object.freeze({
  REQUEST_RECEIVED: 'connection_request_received',
  REQUEST_ACCEPTED: 'connection_request_accepted',
  REQUEST_REJECTED: 'connection_request_rejected',
  REQUEST_CANCELLED: 'connection_request_cancelled',
  CONNECTION_REMOVED: 'connection_removed',
  USER_BLOCKED: 'user_blocked',
  USER_UNBLOCKED: 'user_unblocked',
});

export const domainEvents = new EventEmitter();
domainEvents.setMaxListeners(20);

export function emitDomainEvent(name, payload) {
  logger.debug('domain event', { name });
  domainEvents.emit(name, payload);
}

export default domainEvents;
