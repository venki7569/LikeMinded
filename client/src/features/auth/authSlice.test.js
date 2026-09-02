import { describe, expect, it } from 'vitest';
import authReducer, {
  clearAuthError,
  loginUser,
  restoreSession,
  sessionExpired,
  setUser,
} from './authSlice';

const initialState = authReducer(undefined, { type: '@@INIT' });

const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'user' };

describe('authSlice', () => {
  it('starts unauthenticated and initializing', () => {
    expect(initialState.isAuthenticated).toBe(false);
    expect(initialState.isInitializing).toBe(true);
    expect(initialState.user).toBeNull();
  });

  it('marks submission in flight on login pending', () => {
    const state = authReducer(initialState, loginUser.pending('req'));
    expect(state.isSubmitting).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores the user on a fulfilled login', () => {
    const state = authReducer(
      initialState,
      loginUser.fulfilled({ user, accessToken: 'token' }, 'req')
    );

    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.isSubmitting).toBe(false);
    expect(state.isInitializing).toBe(false);
  });

  it('records the message and field errors on a rejected login', () => {
    const payload = { message: 'Incorrect email/username or password', fieldErrors: { password: 'Required' } };
    const action = { type: loginUser.rejected.type, payload };
    const state = authReducer({ ...initialState, isSubmitting: true }, action);

    expect(state.error).toBe(payload.message);
    expect(state.fieldErrors.password).toBe('Required');
    expect(state.isAuthenticated).toBe(false);
  });

  it('clears errors on demand', () => {
    const dirty = { ...initialState, error: 'Boom', fieldErrors: { email: 'Bad' } };
    const state = authReducer(dirty, clearAuthError());

    expect(state.error).toBeNull();
    expect(state.fieldErrors).toEqual({});
  });

  it('finishes initializing when no refresh cookie exists', () => {
    const state = authReducer(initialState, {
      type: restoreSession.rejected.type,
      payload: { message: 'No refresh token provided' },
    });

    expect(state.isInitializing).toBe(false);
    expect(state.isAuthenticated).toBe(false);
  });

  it('drops the session when the token expires mid-use', () => {
    const signedIn = authReducer(
      initialState,
      loginUser.fulfilled({ user, accessToken: 'token' }, 'req')
    );
    const state = authReducer(signedIn, sessionExpired());

    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('replaces the cached user with setUser', () => {
    const state = authReducer(initialState, setUser(user));
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(true);
  });
});
