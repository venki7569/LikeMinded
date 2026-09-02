import { describe, expect, it } from 'vitest';
import { can, canRemoveMember, COMMUNITY_ACTIONS, MEMBER_ROLES } from '../../src/utils/communityPermissions.js';
import { slugify } from '../../src/services/community.service.js';

describe('community permissions', () => {
  it('gives owners every action and blocks members from managing', () => {
    expect(can(MEMBER_ROLES.OWNER, COMMUNITY_ACTIONS.DELETE)).toBe(true);
    expect(can(MEMBER_ROLES.MODERATOR, COMMUNITY_ACTIONS.INVITE)).toBe(true);
    expect(can(MEMBER_ROLES.MODERATOR, COMMUNITY_ACTIONS.TRANSFER)).toBe(false);
    expect(can(MEMBER_ROLES.MEMBER, COMMUNITY_ACTIONS.REMOVE_MEMBER)).toBe(false);
  });

  it('stops moderators from removing owners or other moderators', () => {
    expect(canRemoveMember(MEMBER_ROLES.MODERATOR, MEMBER_ROLES.MEMBER)).toBe(true);
    expect(canRemoveMember(MEMBER_ROLES.MODERATOR, MEMBER_ROLES.MODERATOR)).toBe(false);
    expect(canRemoveMember(MEMBER_ROLES.MODERATOR, MEMBER_ROLES.OWNER)).toBe(false);
    expect(canRemoveMember(MEMBER_ROLES.OWNER, MEMBER_ROLES.MODERATOR)).toBe(true);
    expect(canRemoveMember(MEMBER_ROLES.OWNER, MEMBER_ROLES.OWNER)).toBe(false);
  });
});

describe('slugify', () => {
  it('produces a url-safe slug', () => {
    expect(slugify('Analytical Engine!')).toBe('analytical-engine');
  });
});
