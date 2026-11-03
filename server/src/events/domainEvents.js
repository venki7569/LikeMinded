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

export const POST_EVENTS = Object.freeze({
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  POST_LIKED: 'post.liked',
  POST_UNLIKED: 'post.unliked',
  COMMENT_CREATED: 'comment.created',
  COMMENT_UPDATED: 'comment.updated',
  COMMENT_DELETED: 'comment.deleted',
});

export const COMMUNITY_EVENTS = Object.freeze({
  CREATED: 'community.created',
  UPDATED: 'community.updated',
  DELETED: 'community.deleted',
  MEMBER_JOINED: 'community.member_joined',
  MEMBER_LEFT: 'community.member_left',
  MEMBER_REMOVED: 'community.member_removed',
  JOIN_REQUEST_CREATED: 'community.join_request_created',
  JOIN_REQUEST_APPROVED: 'community.join_request_approved',
  JOIN_REQUEST_REJECTED: 'community.join_request_rejected',
  JOIN_REQUEST_CANCELLED: 'community.join_request_cancelled',
  MODERATOR_PROMOTED: 'community.moderator_promoted',
  MODERATOR_DEMOTED: 'community.moderator_demoted',
  OWNERSHIP_TRANSFERRED: 'community.ownership_transferred',
  INVITATION_CREATED: 'community.invitation_created',
  INVITATION_ACCEPTED: 'community.invitation_accepted',
  INVITATION_REJECTED: 'community.invitation_rejected',
});

export const domainEvents = new EventEmitter();
domainEvents.setMaxListeners(20);

export function emitDomainEvent(name, payload) {
  logger.debug('domain event', { name });
  domainEvents.emit(name, payload);
}

export default domainEvents;
