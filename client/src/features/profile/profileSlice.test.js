import { describe, expect, it } from 'vitest';
import profileReducer, {
  clearViewedProfile,
  fetchProfileByUsername,
  saveOwnProfile,
} from './profileSlice';

const profile = {
  username: 'ada',
  displayName: 'Ada',
  isOwner: true,
  completeness: { percentage: 40, missing: ['bio'] },
};

describe('profileSlice', () => {
  it('starts idle with no viewed profile', () => {
    const state = profileReducer(undefined, { type: '@@INIT' });
    expect(state.status).toBe('idle');
    expect(state.viewed).toBeNull();
  });

  it('stores a fetched profile', () => {
    const state = profileReducer(
      undefined,
      fetchProfileByUsername.fulfilled({ profile }, 'req', 'ada')
    );
    expect(state.status).toBe('succeeded');
    expect(state.viewed).toEqual(profile);
  });

  it('records an error when a private profile is blocked', () => {
    const state = profileReducer(
      { viewed: null, completeness: null, status: 'loading', error: null },
      { type: fetchProfileByUsername.rejected.type, payload: { message: 'This profile is private' } }
    );
    expect(state.status).toBe('failed');
    expect(state.error).toMatch(/private/i);
  });

  it('updates completeness after a save', () => {
    const saved = { ...profile, completeness: { percentage: 100, missing: [] } };
    const state = profileReducer(
      { viewed: profile, completeness: profile.completeness, status: 'succeeded', error: null },
      saveOwnProfile.fulfilled({ profile: saved }, 'req')
    );
    expect(state.completeness.percentage).toBe(100);
  });

  it('clears the viewed profile', () => {
    const state = profileReducer(
      { viewed: profile, completeness: null, status: 'succeeded', error: null },
      clearViewedProfile()
    );
    expect(state.viewed).toBeNull();
  });
});
