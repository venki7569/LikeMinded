import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted so the mock factory below can reference it (factories run before imports).
const sentEmails = vi.hoisted(() => ({ verification: [], reset: [], changed: [] }));

vi.mock('../src/services/email.service.js', () => ({
  sendVerificationEmail: async (user, token) => {
    sentEmails.verification.push({ email: user.email, token });
  },
  sendPasswordResetEmail: async (user, token) => {
    sentEmails.reset.push({ email: user.email, token });
  },
  sendPasswordChangedEmail: async (user) => {
    sentEmails.changed.push({ email: user.email });
  },
}));

const { API, client, extractRefreshCookie, registerUser, validCredentials } = await import(
  './helpers/testApp.js'
);

beforeEach(() => {
  sentEmails.verification.length = 0;
  sentEmails.reset.length = 0;
  sentEmails.changed.length = 0;
});

describe('GET /health', () => {
  it('reports a connected database', async () => {
    const response = await client.get(`${API}/health`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database).toBe('connected');
  });
});

describe('POST /auth/register', () => {
  it('creates an account, hides the password, and sets a refresh cookie', async () => {
    const { response } = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(validCredentials.email);
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.user.isEmailVerified).toBe(false);
    expect(response.body.data.accessToken).toBeTypeOf('string');

    const cookie = extractRefreshCookie(response);
    expect(cookie).toMatch(/^refreshToken=/);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('sends exactly one verification email', async () => {
    await registerUser();

    expect(sentEmails.verification).toHaveLength(1);
    expect(sentEmails.verification[0].email).toBe(validCredentials.email);
  });

  it('rejects a duplicate email', async () => {
    await registerUser();
    const { response } = await registerUser({ username: 'different' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/email is already taken/i);
  });

  it('rejects a duplicate username', async () => {
    await registerUser();
    const { response } = await registerUser({ email: 'other@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/username is already taken/i);
  });

  it.each([
    ['a password with no digits', { password: 'password' }],
    ['a password that is too short', { password: 'Pw1' }],
    ['an invalid email', { email: 'not-an-email' }],
    ['a username with spaces', { username: 'ada lovelace' }],
  ])('returns 400 for %s', async (_label, overrides) => {
    const { response } = await registerUser(overrides);

    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown fields instead of silently ignoring them', async () => {
    const { response } = await registerUser({ role: 'admin' });

    expect(response.status).toBe(400);
  });

  it('never lets a client self-assign the admin role', async () => {
    await registerUser();
    const login = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: validCredentials.password });

    expect(login.body.data.user.role).toBe('user');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('signs in with an email address', async () => {
    const response = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: validCredentials.password });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTypeOf('string');
  });

  it('signs in with a username', async () => {
    const response = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.username, password: validCredentials.password });

    expect(response.status).toBe(200);
  });

  it('uses one message for both unknown accounts and wrong passwords', async () => {
    const wrongPassword = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: 'Wrongpass123' });
    const unknownUser = await client
      .post(`${API}/auth/login`)
      .send({ identifier: 'nobody@example.com', password: 'Wrongpass123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });
});

describe('GET /auth/me', () => {
  it('returns the signed-in user', async () => {
    const { response } = await registerUser();
    const me = await client
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${response.body.data.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe(validCredentials.username);
  });

  it('rejects a missing token', async () => {
    const response = await client.get(`${API}/auth/me`);
    expect(response.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const response = await client.get(`${API}/auth/me`).set('Authorization', 'Bearer nonsense');
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const { response } = await registerUser();
    const cookie = extractRefreshCookie(response);

    const refreshed = await client.post(`${API}/auth/refresh`).set('Cookie', cookie);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTypeOf('string');
    expect(extractRefreshCookie(refreshed)).not.toBe(cookie);
  });

  it('revokes every session when a rotated token is replayed', async () => {
    const { response } = await registerUser();
    const original = extractRefreshCookie(response);

    const refreshed = await client.post(`${API}/auth/refresh`).set('Cookie', original);
    const current = extractRefreshCookie(refreshed);

    const replay = await client.post(`${API}/auth/refresh`).set('Cookie', original);
    expect(replay.status).toBe(401);

    // Reuse detection must also invalidate the token issued by the rotation.
    const afterBreach = await client.post(`${API}/auth/refresh`).set('Cookie', current);
    expect(afterBreach.status).toBe(401);
  });

  it('rejects a request with no cookie', async () => {
    const response = await client.post(`${API}/auth/refresh`);
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('invalidates the refresh token and clears the cookie', async () => {
    const { response } = await registerUser();
    const cookie = extractRefreshCookie(response);

    const loggedOut = await client.post(`${API}/auth/logout`).set('Cookie', cookie);
    expect(loggedOut.status).toBe(200);

    const reuse = await client.post(`${API}/auth/refresh`).set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });
});

describe('Email verification', () => {
  it('verifies the account with the emailed token', async () => {
    await registerUser();
    const { token } = sentEmails.verification[0];

    const response = await client.post(`${API}/auth/verify-email`).send({ token });

    expect(response.status).toBe(200);
    expect(response.body.data.user.isEmailVerified).toBe(true);
  });

  it('refuses to reuse a verification token', async () => {
    await registerUser();
    const { token } = sentEmails.verification[0];

    await client.post(`${API}/auth/verify-email`).send({ token });
    const second = await client.post(`${API}/auth/verify-email`).send({ token });

    expect(second.status).toBe(400);
  });

  it('rejects an unknown token', async () => {
    const response = await client
      .post(`${API}/auth/verify-email`)
      .send({ token: 'a'.repeat(96) });

    expect(response.status).toBe(400);
  });

  it('invalidates the previous link when a new one is requested', async () => {
    await registerUser();
    const firstToken = sentEmails.verification[0].token;

    await client
      .post(`${API}/auth/resend-verification`)
      .send({ email: validCredentials.email });
    expect(sentEmails.verification).toHaveLength(2);

    const stale = await client.post(`${API}/auth/verify-email`).send({ token: firstToken });
    expect(stale.status).toBe(400);
  });

  it('does not reveal whether an address is registered', async () => {
    const response = await client
      .post(`${API}/auth/resend-verification`)
      .send({ email: 'nobody@example.com' });

    expect(response.status).toBe(200);
    expect(sentEmails.verification).toHaveLength(0);
  });
});

describe('Password reset', () => {
  it('emails a reset link and accepts the new password', async () => {
    await registerUser();

    await client.post(`${API}/auth/forgot-password`).send({ email: validCredentials.email });
    expect(sentEmails.reset).toHaveLength(1);

    const reset = await client
      .post(`${API}/auth/reset-password`)
      .send({ token: sentEmails.reset[0].token, password: 'BrandNew123' });
    expect(reset.status).toBe(200);

    const withNew = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: 'BrandNew123' });
    expect(withNew.status).toBe(200);

    const withOld = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: validCredentials.password });
    expect(withOld.status).toBe(401);
  });

  it('revokes existing sessions after a reset', async () => {
    const { response } = await registerUser();
    const cookie = extractRefreshCookie(response);

    await client.post(`${API}/auth/forgot-password`).send({ email: validCredentials.email });
    await client
      .post(`${API}/auth/reset-password`)
      .send({ token: sentEmails.reset[0].token, password: 'BrandNew123' });

    const refreshed = await client.post(`${API}/auth/refresh`).set('Cookie', cookie);
    expect(refreshed.status).toBe(401);
  });

  it('returns 200 for an unknown address without sending mail', async () => {
    const response = await client
      .post(`${API}/auth/forgot-password`)
      .send({ email: 'nobody@example.com' });

    expect(response.status).toBe(200);
    expect(sentEmails.reset).toHaveLength(0);
  });

  it('rejects a weak replacement password', async () => {
    await registerUser();
    await client.post(`${API}/auth/forgot-password`).send({ email: validCredentials.email });

    const response = await client
      .post(`${API}/auth/reset-password`)
      .send({ token: sentEmails.reset[0].token, password: 'short' });

    expect(response.status).toBe(400);
  });
});

describe('PATCH /auth/change-password', () => {
  it('changes the password and invalidates the old access token', async () => {
    const { response } = await registerUser();
    const { accessToken } = response.body.data;

    const changed = await client
      .patch(`${API}/auth/change-password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: validCredentials.password, newPassword: 'Another123' });
    expect(changed.status).toBe(200);

    const staleToken = await client
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(staleToken.status).toBe(401);

    const login = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: 'Another123' });
    expect(login.status).toBe(200);
  });

  it('rejects an incorrect current password', async () => {
    const { response } = await registerUser();

    const changed = await client
      .patch(`${API}/auth/change-password`)
      .set('Authorization', `Bearer ${response.body.data.accessToken}`)
      .send({ currentPassword: 'Wrongpass123', newPassword: 'Another123' });

    expect(changed.status).toBe(400);
  });

  it('rejects reusing the same password', async () => {
    const { response } = await registerUser();

    const changed = await client
      .patch(`${API}/auth/change-password`)
      .set('Authorization', `Bearer ${response.body.data.accessToken}`)
      .send({ currentPassword: validCredentials.password, newPassword: validCredentials.password });

    expect(changed.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await client
      .patch(`${API}/auth/change-password`)
      .send({ currentPassword: validCredentials.password, newPassword: 'Another123' });

    expect(response.status).toBe(401);
  });
});

describe('Unknown routes', () => {
  it('returns a structured 404', async () => {
    const response = await client.get(`${API}/does-not-exist`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
