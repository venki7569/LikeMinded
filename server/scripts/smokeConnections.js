/**
 * Phase 4 smoke: register A and B, connect, list, profile status, remove, block, unblock, request again.
 * Run against a live API: node scripts/smokeConnections.js http://localhost:5000/api/v1
 */
const base = process.argv[2] ?? 'http://localhost:5000/api/v1';

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${json.message ?? ''}`);
  }
  return json;
}

async function register(name, username, email) {
  const json = await request('POST', '/auth/register', {
    body: { name, username, email, password: 'Passw0rd123' },
  });
  return { token: json.data.accessToken, user: json.data.user };
}

const ada = await register('Ada Lovelace', `ada_smoke_${Date.now()}`.slice(0, 30), `ada.smoke.${Date.now()}@example.com`);
const grace = await register(
  'Grace Hopper',
  `grace_smoke_${Date.now()}`.slice(0, 30),
  `grace.smoke.${Date.now()}@example.com`
);

await request('PUT', '/users/me/profile', {
  token: grace.token,
  body: { occupation: 'Computer scientist', skills: ['cobol'], interests: ['navy'] },
});

const people = await request('GET', `/people?q=${encodeURIComponent(grace.user.username)}`, {
  token: ada.token,
});
if (people.data.people[0]?.user.username !== grace.user.username) {
  throw new Error('Discovery did not find Grace');
}

const sent = await request('POST', '/connections/requests', {
  token: ada.token,
  body: { userId: grace.user.id },
});
if (sent.data.relationship.status !== 'outgoing_pending') throw new Error('Expected outgoing_pending');

const incoming = await request('GET', '/connections/requests/incoming', { token: grace.token });
if (incoming.data.requests.length !== 1) throw new Error('Expected one incoming request');

await request('POST', `/connections/requests/${sent.data.request.id}/accept`, { token: grace.token });

const connections = await request('GET', '/connections', { token: ada.token });
if (connections.data.connections[0]?.user.username !== grace.user.username) {
  throw new Error('Grace missing from Ada connections');
}

const status = await request('GET', `/connections/status/${grace.user.id}`, { token: ada.token });
if (status.data.relationship.status !== 'connected') throw new Error('Expected connected');

await request('DELETE', `/connections/${grace.user.id}`, { token: ada.token });
await request('POST', '/connections/blocks', { token: ada.token, body: { userId: grace.user.id } });

const blockedList = await request('GET', '/connections/blocks', { token: ada.token });
if (blockedList.data.blocked.length !== 1) throw new Error('Expected blocked list');

try {
  await request('POST', '/connections/requests', { token: grace.token, body: { userId: ada.user.id } });
  throw new Error('Blocked user was able to send a request');
} catch (error) {
  if (!String(error.message).includes('403')) throw error;
}

await request('DELETE', `/connections/blocks/${grace.user.id}`, { token: ada.token });
const again = await request('POST', '/connections/requests', {
  token: ada.token,
  body: { userId: grace.user.id },
});
if (again.data.relationship.status !== 'outgoing_pending') throw new Error('Expected request after unblock');

const docs = await fetch(base.replace(/\/api\/v1$/, '/api-docs.json'));
if (!docs.ok) throw new Error('Swagger spec missing');
const spec = await docs.json();
if (!spec.paths['/connections/requests'] || !spec.paths['/people']) {
  throw new Error('Swagger is missing connection or people paths');
}

console.log('Phase 4 smoke test passed.');
