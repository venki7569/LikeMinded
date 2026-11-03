/**
 * Phase 5 live smoke: happy paths plus duplicate/privacy/IDOR guards.
 * node scripts/smokeCommunities.js http://localhost:5000/api/v1
 */
const base = process.argv[2] ?? 'http://localhost:5000/api/v1';

async function raw(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function request(method, path, options = {}) {
  const { status, json } = await raw(method, path, options);
  if (status < 200 || status >= 300) {
    throw new Error(`${method} ${path} -> ${status} ${json.message ?? ''}`);
  }
  return json;
}

function expectStatus(actual, expected, label) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    throw new Error(`${label}: expected ${allowed.join('|')}, got ${actual}`);
  }
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
const outsider = await register('Out Sider', `out_c_${stamp}`.slice(0, 30), `out.c.${stamp}@example.com`);

const unauthCreate = await raw('POST', '/communities', {
  body: { name: 'Nope', category: 'other' },
});
expectStatus(unauthCreate.status, 401, 'unauthenticated create');

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
const afterJoin = await request('GET', `/communities/${slug}`, { token: ada.token });
if (afterJoin.data.community.memberCount !== 2) throw new Error('memberCount after public join');

const dupJoin = await raw('POST', `/communities/${slug}/join`, { token: grace.token });
expectStatus(dupJoin.status, 409, 'duplicate public join');

const ownerLeave = await raw('POST', `/communities/${slug}/leave`, { token: ada.token });
expectStatus(ownerLeave.status, 400, 'owner leave without transfer');

const removeOwner = await raw('DELETE', `/communities/${slug}/members/${ada.user.id}`, { token: grace.token });
expectStatus(removeOwner.status, [400, 403], 'remove owner');

const outsiderPromote = await raw('POST', `/communities/${slug}/moderators/${grace.user.id}`, {
  token: outsider.token,
});
expectStatus(outsiderPromote.status, 403, 'outsider promote');

const outsiderUpdate = await raw('PUT', `/communities/${slug}`, {
  token: outsider.token,
  body: { name: 'Hijacked' },
});
expectStatus(outsiderUpdate.status, 403, 'outsider update');

const roleSmuggle = await raw('PUT', `/communities/${slug}`, {
  token: grace.token,
  body: { role: 'owner' },
});
expectStatus(roleSmuggle.status, [400, 403], 'role smuggle');

const privateCreated = await request('POST', '/communities', {
  token: ada.token,
  body: { name: `Vault ${stamp}`, privacy: 'private', category: 'other' },
});
const privateSlug = privateCreated.data.community.slug;

const strangerDetail = await request('GET', `/communities/${privateSlug}`, { token: alan.token });
if (strangerDetail.data.community.owner?.username) {
  throw new Error('Private community leaked owner card');
}
if (strangerDetail.data.community.viewer?.isMember) throw new Error('Stranger marked as member');

const privateMembers = await raw('GET', `/communities/${privateSlug}/members`, { token: alan.token });
expectStatus(privateMembers.status, 403, 'private members list');

const requested = await request('POST', `/communities/${privateSlug}/join`, { token: grace.token });
if (requested.data.state !== 'pending_request') throw new Error('Expected pending request');
const requestId = requested.data.request.id;

const dupRequest = await raw('POST', `/communities/${privateSlug}/join`, { token: grace.token });
expectStatus(dupRequest.status, 409, 'duplicate join request');

const alanRequest = await request('POST', `/communities/${privateSlug}/join`, { token: alan.token });
const outsiderApprove = await raw(
  'POST',
  `/communities/${privateSlug}/join-requests/${alanRequest.data.request.id}/approve`,
  { token: outsider.token }
);
expectStatus(outsiderApprove.status, 403, 'outsider approve');

const idorApprove = await raw('POST', `/communities/${slug}/join-requests/${requestId}/approve`, {
  token: ada.token,
});
expectStatus(idorApprove.status, [403, 404], 'IDOR approve on wrong community');

await request('POST', `/communities/${privateSlug}/join-requests/${alanRequest.data.request.id}/reject`, {
  token: ada.token,
});
await request('POST', `/communities/${privateSlug}/join-requests/${requestId}/approve`, {
  token: ada.token,
});
const privateAfterApprove = await request('GET', `/communities/${privateSlug}`, { token: ada.token });
if (privateAfterApprove.data.community.memberCount !== 2) {
  throw new Error('memberCount after approve');
}

const members = await request('GET', `/communities/${slug}/members`, { token: ada.token });
if (!members.data.members.some((row) => row.user.id === grace.user.id)) {
  throw new Error('Grace missing from members list');
}

await request('POST', `/communities/${slug}/moderators/${grace.user.id}`, { token: ada.token });
const graceAsMod = await request('GET', `/communities/${slug}`, { token: grace.token });
if (graceAsMod.data.community.viewer.role !== 'moderator') throw new Error('Promote failed');

const modRemoveOwner = await raw('DELETE', `/communities/${slug}/members/${ada.user.id}`, {
  token: grace.token,
});
expectStatus(modRemoveOwner.status, [400, 403], 'moderator cannot remove owner');

await request('DELETE', `/communities/${slug}/moderators/${grace.user.id}`, { token: ada.token });
const graceDemoted = await request('GET', `/communities/${slug}`, { token: grace.token });
if (graceDemoted.data.community.viewer.role !== 'member') throw new Error('Demote failed');

await request('POST', `/communities/${slug}/invitations`, { token: ada.token, body: { userId: alan.user.id } });
const dupInvite = await raw('POST', `/communities/${slug}/invitations`, {
  token: ada.token,
  body: { userId: alan.user.id },
});
expectStatus(dupInvite.status, 409, 'duplicate invitation');

const outsiderInvite = await raw('POST', `/communities/${slug}/invitations`, {
  token: outsider.token,
  body: { userId: alan.user.id },
});
expectStatus(outsiderInvite.status, 403, 'unauthorized invitation');

const invites = await request('GET', '/communities/invitations', { token: alan.token });
const invitationId = invites.data.invitations[0].id;
const stolenAccept = await raw('POST', `/communities/invitations/${invitationId}/accept`, {
  token: outsider.token,
});
expectStatus(stolenAccept.status, [403, 404], 'IDOR accept invitation');

await request('POST', `/communities/invitations/${invitationId}/accept`, { token: alan.token });
const afterInvite = await request('GET', `/communities/${slug}`, { token: ada.token });
if (afterInvite.data.community.memberCount !== 3) throw new Error('memberCount after invitation accept');

await request('POST', `/communities/${slug}/leave`, { token: alan.token });
const afterLeave = await request('GET', `/communities/${slug}`, { token: ada.token });
if (afterLeave.data.community.memberCount !== 2) throw new Error('memberCount after leave');

await request('POST', `/communities/${slug}/transfer-ownership`, {
  token: ada.token,
  body: { userId: grace.user.id },
});
const asGrace = await request('GET', `/communities/${slug}`, { token: grace.token });
if (asGrace.data.community.viewer.role !== 'owner') throw new Error('Transfer failed');
const asAda = await request('GET', `/communities/${slug}`, { token: ada.token });
if (asAda.data.community.viewer.role !== 'moderator') throw new Error('Former owner should be moderator');

const adaDelete = await raw('DELETE', `/communities/${slug}`, { token: ada.token });
expectStatus(adaDelete.status, 403, 'former owner cannot delete');

const unauthorizedMembers = await raw('GET', `/communities/${privateSlug}/members`, {
  token: alan.token,
});
expectStatus(unauthorizedMembers.status, 403, 'private members still protected');

await request('DELETE', `/communities/${slug}`, { token: grace.token });
const gone = await raw('GET', `/communities/${slug}`, { token: grace.token });
expectStatus(gone.status, 404, 'deleted community');

await request('DELETE', `/communities/${privateSlug}`, { token: ada.token });

const spec = await fetch(base.replace(/\/api\/v1$/, '/api-docs.json')).then((res) => res.json());
const required = [
  '/communities',
  '/communities/{slug}',
  '/communities/{slug}/join',
  '/communities/{slug}/leave',
  '/communities/{slug}/members',
  '/communities/{slug}/members/{userId}',
  '/communities/{slug}/moderators/{userId}',
  '/communities/{slug}/transfer-ownership',
  '/communities/{slug}/join-requests',
  '/communities/{slug}/join-requests/{requestId}/approve',
  '/communities/{slug}/join-requests/{requestId}/reject',
  '/communities/{slug}/join-requests/{requestId}/cancel',
  '/communities/{slug}/invitations',
  '/communities/invitations',
  '/communities/invitations/{invitationId}/accept',
  '/communities/invitations/{invitationId}/reject',
];
const missing = required.filter((path) => !spec.paths[path]);
if (missing.length) throw new Error(`Swagger missing: ${missing.join(', ')}`);

console.log('Phase 5 smoke test passed.');
