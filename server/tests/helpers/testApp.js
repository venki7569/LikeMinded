import request from 'supertest';
import createApp from '../../src/app.js';

export const API = '/api/v1';

export const app = createApp();
export const client = request(app);

export const validCredentials = {
  name: 'Ada Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  password: 'Passw0rd123',
};

export async function registerUser(overrides = {}) {
  const payload = { ...validCredentials, ...overrides };
  const response = await client.post(`${API}/auth/register`).send(payload);
  return { response, payload };
}

/** Pulls the `refreshToken` cookie value out of a supertest response. */
export function extractRefreshCookie(response) {
  const cookies = response.headers['set-cookie'] ?? [];
  const cookie = cookies.find((value) => value.startsWith('refreshToken='));
  if (!cookie) return null;
  return cookie.split(';')[0];
}
