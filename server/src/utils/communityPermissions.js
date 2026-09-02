import ApiError from './ApiError.js';

export const MEMBER_ROLES = Object.freeze({
  OWNER: 'owner',
  MODERATOR: 'moderator',
  MEMBER: 'member',
});

export const COMMUNITY_ACTIONS = Object.freeze({
  VIEW: 'view',
  VIEW_PRIVATE: 'view_private',
  VIEW_MEMBERS: 'view_members',
  EDIT: 'edit',
  EDIT_PRIVACY: 'edit_privacy',
  DELETE: 'delete',
  LEAVE: 'leave',
  INVITE: 'invite',
  MANAGE_REQUESTS: 'manage_requests',
  REMOVE_MEMBER: 'remove_member',
  REMOVE_MODERATOR: 'remove_moderator',
  PROMOTE_MODERATOR: 'promote_moderator',
  DEMOTE_MODERATOR: 'demote_moderator',
  TRANSFER: 'transfer_ownership',
});

const ROLE_ACTIONS = Object.freeze({
  [MEMBER_ROLES.OWNER]: new Set(Object.values(COMMUNITY_ACTIONS)),
  [MEMBER_ROLES.MODERATOR]: new Set([
    COMMUNITY_ACTIONS.VIEW,
    COMMUNITY_ACTIONS.VIEW_PRIVATE,
    COMMUNITY_ACTIONS.VIEW_MEMBERS,
    COMMUNITY_ACTIONS.EDIT,
    COMMUNITY_ACTIONS.LEAVE,
    COMMUNITY_ACTIONS.INVITE,
    COMMUNITY_ACTIONS.MANAGE_REQUESTS,
    COMMUNITY_ACTIONS.REMOVE_MEMBER,
  ]),
  [MEMBER_ROLES.MEMBER]: new Set([
    COMMUNITY_ACTIONS.VIEW,
    COMMUNITY_ACTIONS.VIEW_PRIVATE,
    COMMUNITY_ACTIONS.VIEW_MEMBERS,
    COMMUNITY_ACTIONS.LEAVE,
  ]),
});

export function can(role, action) {
  if (!role) return action === COMMUNITY_ACTIONS.VIEW;
  return ROLE_ACTIONS[role]?.has(action) === true;
}

export function assertCan(role, action, message = 'You do not have permission to perform this action') {
  if (!can(role, action)) throw ApiError.forbidden(message);
}

/** Moderators may remove members, never owners or other moderators. Owners may remove anyone except themselves. */
export function canRemoveMember(actorRole, targetRole) {
  if (targetRole === MEMBER_ROLES.OWNER) return false;
  if (actorRole === MEMBER_ROLES.OWNER) return targetRole !== MEMBER_ROLES.OWNER;
  if (actorRole === MEMBER_ROLES.MODERATOR) return targetRole === MEMBER_ROLES.MEMBER;
  return false;
}

export default {
  MEMBER_ROLES,
  COMMUNITY_ACTIONS,
  can,
  assertCan,
  canRemoveMember,
};
