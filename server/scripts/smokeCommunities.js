/**
 * Phase 5 smoke: create, join, private request, approve, moderate, invite, transfer, delete.
 * node scripts/smokeCommunities.js http://localhost:5000/api/v1
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

const stamp = Date.now();
const ada = await register('Ada Lovelace', `ada_c_${stamp}`.slice(0, 30), `ada.c.${stamp}@example.com`);
const grace = await register('Grace Hopper', `grace_c_${stamp}`.slice(0, 30), `grace.c.${stamp}@example.com`);
const alan = await register('Alan Turing', `alan_c_${stamp}`.slice(0, 30), `alan.c.${stamp}@example.com`);

const created = await request('POST', '/communities', {
  token: ada.token,
  body: {
    name: `Engineers ${stamp}`,
    description: 'Builders.',
    category: 'technology',
    interests: ['computing'],
    privacy: 'public',
  },
});
const slug = created.data.community.slug;
if (created.data.community.viewer.role !== 'owner') throw new Error('Creator is not owner');
if (created.data.community.memberCount !== 1) throw new Error('Owner membership missing');

const search = await request('GET', `/communities?q=${encodeURIComponent(slug)}`, { token: grace.token });
if (!search.data.communities.some((item) => item.slug === slug)) throw new Error('Search missed community');

await request('POST', `/communities/${slug}/join`, { token: grace.token });

const privateCreated = await request('POST', '/communities', {
  token: ada.token,
  body: { name: `Vault ${stamp}`, privacy: 'private', category: 'other' },
});
const privateSlug = privateCreated.data.community.slug;
const requested = await request('POST', `/communities/${privateSlug}/join`, { token: grace.token });
if (requested.data.state !== 'pending_request') throw new Error('Expected pending request');
await request('POST', `/communities/${privateSlug}/join-requests/${requested.data.request.id}/approve`, {
  token: ada.token,
});

await request('POST', `/communities/${slug}/moderators/${grace.user.id}`, { token: ada.token });
await request('DELETE', `/communities/${slug}/moderators/${grace.user.id}`, { token: ada.token });

await request('POST', `/communities/${slug}/invitations`, { token: ada.token, body: { userId: alan.user.id } });
const invites = await request('GET', '/communities/invitations', { token: alan.token });
await request('POST', `/communities/invitations/${invites.data.invitations[0].id}/accept`, {
  token: alan.token,
});

await request('POST', `/communities/${slug}/leave`, { token: alan.token });
await request('POST', `/communities/${slug}/transfer-ownership`, {
  token: ada.token,
  body: { userId: grace.user.id },
});
const asGrace = await request('GET', `/communities/${slug}`, { token: grace.token });
if (asGrace.data.community.viewer.role !== 'owner') throw new Error('Transfer failed');

const unauthorized = await fetch(`${base}/communities/${privateSlug}/members`, {
  headers: { Authorization: `Bearer ${alan.token}` },
});
if (unauthorized.status !== 403) throw new Error('Private members leaked');

await request('DELETE', `/communities/${slug}`, { token: grace.token });
await request('DELETE', `/communities/${privateSlug}`, { token: ada.token });

const spec = await fetch(base.replace(/\/api\/v1$/, '/api-docs.json')).then((res) => res.json());
if (!spec.paths['/communities'] || !spec.paths['/communities/{slug}/join']) {
  throw new Error('Swagger missing community paths');
}

console.log('Phase 5 smoke test passed.');
