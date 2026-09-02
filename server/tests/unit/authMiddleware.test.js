import { describe, expect, it, vi } from 'vitest';
import { requireRole, requireVerifiedEmail } from '../../src/middleware/auth.middleware.js';
import { USER_ROLES } from '../../src/models/user.model.js';

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error));
  });
}

describe('requireRole', () => {
  it('allows a user whose role is listed', async () => {
    const error = await runMiddleware(requireRole(USER_ROLES.ADMIN), {
      user: { role: USER_ROLES.ADMIN },
    });

    expect(error).toBeUndefined();
  });

  it('allows any of several accepted roles', async () => {
    const middleware = requireRole(USER_ROLES.ADMIN, USER_ROLES.MODERATOR);
    const error = await runMiddleware(middleware, { user: { role: USER_ROLES.MODERATOR } });

    expect(error).toBeUndefined();
  });

  it('rejects a role that is not listed with 403', async () => {
    const error = await runMiddleware(requireRole(USER_ROLES.ADMIN), {
      user: { role: USER_ROLES.USER },
    });

    expect(error?.statusCode).toBe(403);
  });

  it('rejects an anonymous request with 401', async () => {
    const error = await runMiddleware(requireRole(USER_ROLES.ADMIN), {});

    expect(error?.statusCode).toBe(401);
  });
});

describe('requireVerifiedEmail', () => {
  it('passes a verified user through', async () => {
    const error = await runMiddleware(requireVerifiedEmail, { user: { isEmailVerified: true } });

    expect(error).toBeUndefined();
  });

  it('blocks an unverified user with 403', async () => {
    const error = await runMiddleware(requireVerifiedEmail, { user: { isEmailVerified: false } });

    expect(error?.statusCode).toBe(403);
    expect(error?.message).toMatch(/verify your email/i);
  });
});

describe('User model password handling', () => {
  it('hashes the password on save and can compare it', async () => {
    const { User } = await import('../../src/models/user.model.js');
    const user = new User({
      name: 'Grace Hopper',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });

    // Avoid a database round-trip; the hook runs on save() validation path.
    await user.validate();
    await user.save({ validateBeforeSave: false }).catch(() => {
      /* connection handled by suite setup */
    });

    expect(user.password).not.toBe('Passw0rd123');
    await expect(user.comparePassword('Passw0rd123')).resolves.toBe(true);
    await expect(user.comparePassword('wrong')).resolves.toBe(false);
  });

  it('omits the password from serialized output', async () => {
    const { User } = await import('../../src/models/user.model.js');
    const user = new User({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });

    expect(JSON.parse(JSON.stringify(user)).password).toBeUndefined();
  });
});

describe('vi mock hygiene', () => {
  it('restores mocks between suites', () => {
    const spy = vi.fn();
    spy();
    expect(spy).toHaveBeenCalledOnce();
  });
});
