import { describe, expect, it } from 'vitest';
import { API, client, registerUser } from './helpers/testApp.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function signup(overrides) {
  const { response } = await registerUser(overrides);
  expect(response.status).toBe(201);
  return { token: response.body.data.accessToken, user: response.body.data.user };
}

async function pair() {
  const ada = await signup();
  const grace = await signup({
    name: 'Grace Hopper',
    username: 'grace',
    email: 'grace@example.com',
    password: 'Passw0rd123',
  });
  return { ada, grace };
}

async function createCommunity(token, body = {}) {
  return client
    .post(`${API}/communities`)
    .set(authHeader(token))
    .send({
      name: 'Analytical Engine',
      description: 'People who care about computation and poetry.',
      category: 'technology',
      interests: ['computing', 'maths'],
      privacy: 'public',
      ...body,
    });
}

describe('community creation', () => {
  it('rejects unauthenticated creation', async () => {
    const response = await client.post(`${API}/communities`).send({ name: 'No Auth' });
    expect(response.status).toBe(401);
  });

  it('creates a community and owner membership', async () => {
    const ada = await signup();
    const response = await createCommunity(ada.token);

    expect(response.status).toBe(201);
    const { community } = response.body.data;
    expect(community.slug).toBe('analytical-engine');
    expect(community.memberCount).toBe(1);
    expect(community.viewer.role).toBe('owner');
    expect(community.viewer.isMember).toBe(true);
    expect(community.owner.username).toBe('ada');
    expect(community.owner.email).toBeUndefined();
    expect(community.interests).toEqual(['computing', 'maths']);
  });

  it('avoids duplicate slugs by suffixing', async () => {
    const ada = await signup();
    expect((await createCommunity(ada.token)).status).toBe(201);
    const second = await createCommunity(ada.token, { name: 'Analytical Engine' });
    expect(second.status).toBe(201);
    expect(second.body.data.community.slug).toBe('analytical-engine-2');
  });

  it('rejects invalid data, javascript URLs and XSS in text', async () => {
    const ada = await signup();
    const invalid = await client
      .post(`${API}/communities`)
      .set(authHeader(ada.token))
      .send({ name: 'A' });
    expect(invalid.status).toBe(400);

    const jsUrl = await createCommunity(ada.token, {
      name: 'Unsafe',
      avatar: { url: 'javascript:alert(1)' },
    });
    expect(jsUrl.status).toBe(400);

    const xss = await createCommunity(ada.token, {
      name: 'Clean Club',
      description: '<script>alert(1)</script>Hello',
    });
    expect(xss.status).toBe(201);
    expect(xss.body.data.community.description).not.toContain('<script>');
    expect(xss.body.data.community.description).toContain('Hello');
  });
});

describe('community discovery', () => {
  it('paginates, searches, filters and sorts', async () => {
    const ada = await signup();
    await createCommunity(ada.token, { name: 'Alpha Tech', category: 'technology', interests: ['rust'] });
    await createCommunity(ada.token, {
      name: 'Beta Arts',
      category: 'arts',
      interests: ['painting'],
      privacy: 'public',
    });
    await createCommunity(ada.token, { name: 'Gamma Science', category: 'science', interests: ['physics'] });

    const page1 = await client.get(`${API}/communities?limit=2&page=1`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.communities).toHaveLength(2);
    expect(page1.body.meta.total).toBe(3);
    expect(page1.body.meta.hasNextPage).toBe(true);

    const search = await client.get(`${API}/communities?q=arts`);
    expect(search.body.data.communities.map((item) => item.slug)).toEqual(['beta-arts']);

    const byCategory = await client.get(`${API}/communities?category=science`);
    expect(byCategory.body.data.communities).toHaveLength(1);

    const byInterest = await client.get(`${API}/communities?interest=rust`);
    expect(byInterest.body.data.communities[0].slug).toBe('alpha-tech');
  });

  it('hides private communities from strangers', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token, { name: 'Secret Lab', privacy: 'private' });

    const asStranger = await client.get(`${API}/communities?q=secret`).set(authHeader(grace.token));
    expect(asStranger.body.data.communities).toHaveLength(0);

    const asOwner = await client.get(`${API}/communities?q=secret`).set(authHeader(ada.token));
    expect(asOwner.body.data.communities).toHaveLength(1);
  });
});

describe('membership', () => {
  it('lets a user join a public community and leave', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);
    const joined = await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));
    expect(joined.status).toBe(200);
    expect(joined.body.data.state).toBe('joined');
    expect(joined.body.data.community.memberCount).toBe(2);

    const duplicate = await client
      .post(`${API}/communities/analytical-engine/join`)
      .set(authHeader(grace.token));
    expect(duplicate.status).toBe(409);

    const left = await client.post(`${API}/communities/analytical-engine/leave`).set(authHeader(grace.token));
    expect(left.status).toBe(200);
    expect(left.body.data.community.memberCount).toBe(1);
  });

  it('creates a pending request for private communities', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token, { name: 'Private Club', privacy: 'private' });
    const requested = await client
      .post(`${API}/communities/private-club/join`)
      .set(authHeader(grace.token));
    expect(requested.status).toBe(200);
    expect(requested.body.data.state).toBe('pending_request');
    expect(requested.body.data.community.memberCount).toBe(1);

    const duplicate = await client.post(`${API}/communities/private-club/join`).set(authHeader(grace.token));
    expect(duplicate.status).toBe(409);
  });

  it('prevents the owner from leaving without a transfer', async () => {
    const ada = await signup();
    await createCommunity(ada.token);
    const response = await client
      .post(`${API}/communities/analytical-engine/leave`)
      .set(authHeader(ada.token));
    expect(response.status).toBe(400);
  });
});

describe('join requests', () => {
  it('approves a request and creates membership', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token, { name: 'Private Club', privacy: 'private' });
    const requested = await client
      .post(`${API}/communities/private-club/join`)
      .set(authHeader(grace.token));
    const requestId = requested.body.data.request.id;

    const outsider = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });
    const unauthorized = await client
      .post(`${API}/communities/private-club/join-requests/${requestId}/approve`)
      .set(authHeader(outsider.token));
    expect(unauthorized.status).toBe(403);

    const approved = await client
      .post(`${API}/communities/private-club/join-requests/${requestId}/approve`)
      .set(authHeader(ada.token));
    expect(approved.status).toBe(200);
    expect(approved.body.data.community.memberCount).toBe(2);
    expect(approved.body.data.community.viewer).toBeTruthy();

    const members = await client
      .get(`${API}/communities/private-club/members`)
      .set(authHeader(ada.token));
    expect(members.body.data.members.map((row) => row.user.username).sort()).toEqual(['ada', 'grace']);
  });

  it('rejects and lets the requester cancel', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token, { name: 'Private Club', privacy: 'private' });
    const first = await client.post(`${API}/communities/private-club/join`).set(authHeader(grace.token));
    const rejectId = first.body.data.request.id;
    expect(
      (
        await client
          .post(`${API}/communities/private-club/join-requests/${rejectId}/reject`)
          .set(authHeader(ada.token))
      ).status
    ).toBe(200);

    const second = await client.post(`${API}/communities/private-club/join`).set(authHeader(grace.token));
    const cancelId = second.body.data.request.id;
    const cancelled = await client
      .post(`${API}/communities/private-club/join-requests/${cancelId}/cancel`)
      .set(authHeader(grace.token));
    expect(cancelled.status).toBe(200);

    const wrongCommunity = await createCommunity(ada.token, { name: 'Other Club', privacy: 'private' });
    expect(wrongCommunity.status).toBe(201);
    const cross = await client
      .post(`${API}/communities/other-club/join-requests/${cancelId}/approve`)
      .set(authHeader(ada.token));
    expect(cross.status).toBe(404);
  });
});

describe('members, moderators and ownership', () => {
  it('lists members with search and pagination, never leaking emails', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);
    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));

    const list = await client.get(`${API}/communities/analytical-engine/members`).set(authHeader(ada.token));
    expect(list.status).toBe(200);
    expect(list.body.data.members).toHaveLength(2);
    expect(list.body.data.members[0].user.email).toBeUndefined();

    const search = await client
      .get(`${API}/communities/analytical-engine/members?q=grace`)
      .set(authHeader(ada.token));
    expect(search.body.data.members).toHaveLength(1);
  });

  it('lets owner remove a member and protects the owner', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);
    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));

    const removed = await client
      .delete(`${API}/communities/analytical-engine/members/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(removed.status).toBe(200);

    const ownerProtect = await client
      .delete(`${API}/communities/analytical-engine/members/${ada.user.id}`)
      .set(authHeader(grace.token));
    expect([401, 403, 404]).toContain(ownerProtect.status);

    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));
    const selfOwner = await client
      .delete(`${API}/communities/analytical-engine/members/${ada.user.id}`)
      .set(authHeader(ada.token));
    expect(selfOwner.status).toBe(400);
  });

  it('promotes and demotes moderators, owner-only', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);
    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));

    const unauthorized = await client
      .post(`${API}/communities/analytical-engine/moderators/${ada.user.id}`)
      .set(authHeader(grace.token));
    expect(unauthorized.status).toBe(403);

    const promoted = await client
      .post(`${API}/communities/analytical-engine/moderators/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.role).toBe('moderator');

    const ownerAsMod = await client
      .post(`${API}/communities/analytical-engine/moderators/${ada.user.id}`)
      .set(authHeader(ada.token));
    expect(ownerAsMod.status).toBe(400);

    const demoted = await client
      .delete(`${API}/communities/analytical-engine/moderators/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(demoted.status).toBe(200);
    expect(demoted.body.data.role).toBe('member');
  });

  it('transfers ownership atomically and rejects invalid targets', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);

    const notMember = await client
      .post(`${API}/communities/analytical-engine/transfer-ownership`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    expect(notMember.status).toBe(400);

    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));
    const transferred = await client
      .post(`${API}/communities/analytical-engine/transfer-ownership`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    expect(transferred.status).toBe(200);
    expect(transferred.body.data.community.viewer.role).toBe('moderator');
    expect(transferred.body.data.community.owner.username).toBe('grace');

    const asNewOwner = await client
      .get(`${API}/communities/analytical-engine`)
      .set(authHeader(grace.token));
    expect(asNewOwner.body.data.community.viewer.role).toBe('owner');
    expect(asNewOwner.body.data.community.memberCount).toBe(2);
  });
});

describe('invitations', () => {
  it('creates, accepts and rejects invitations', async () => {
    const { ada, grace } = await pair();
    const alan = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });
    await createCommunity(ada.token);

    const created = await client
      .post(`${API}/communities/analytical-engine/invitations`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    expect(created.status).toBe(201);

    const duplicate = await client
      .post(`${API}/communities/analytical-engine/invitations`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    expect(duplicate.status).toBe(409);

    const unauthorized = await client
      .post(`${API}/communities/analytical-engine/invitations`)
      .set(authHeader(grace.token))
      .send({ userId: alan.user.id });
    expect(unauthorized.status).toBe(403);

    const mine = await client.get(`${API}/communities/invitations`).set(authHeader(grace.token));
    expect(mine.body.data.invitations).toHaveLength(1);
    const invitationId = mine.body.data.invitations[0].id;

    const idor = await client
      .post(`${API}/communities/invitations/${invitationId}/accept`)
      .set(authHeader(alan.token));
    expect(idor.status).toBe(403);

    const accepted = await client
      .post(`${API}/communities/invitations/${invitationId}/accept`)
      .set(authHeader(grace.token));
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.community.memberCount).toBe(2);

    const inviteAlan = await client
      .post(`${API}/communities/analytical-engine/invitations`)
      .set(authHeader(ada.token))
      .send({ userId: alan.user.id });
    const alanInvite = (await client.get(`${API}/communities/invitations`).set(authHeader(alan.token)))
      .body.data.invitations[0].id;
    expect(inviteAlan.status).toBe(201);
    const rejected = await client
      .post(`${API}/communities/invitations/${alanInvite}/reject`)
      .set(authHeader(alan.token));
    expect(rejected.status).toBe(200);
  });
});

describe('privacy and security', () => {
  it('does not expose private community members to strangers', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token, { name: 'Vault', privacy: 'private' });

    const detail = await client.get(`${API}/communities/vault`).set(authHeader(grace.token));
    expect(detail.status).toBe(200);
    expect(detail.body.data.community.privacy).toBe('private');
    expect(detail.body.data.community.owner.username).toBeUndefined();
    expect(detail.body.data.community.viewer.isMember).toBe(false);

    const members = await client.get(`${API}/communities/vault/members`).set(authHeader(grace.token));
    expect(members.status).toBe(403);
  });

  it('rejects invalid ObjectIds and role smuggling on create', async () => {
    const ada = await signup();
    await createCommunity(ada.token);
    const invalid = await client
      .delete(`${API}/communities/analytical-engine/members/not-an-id`)
      .set(authHeader(ada.token));
    expect(invalid.status).toBe(400);

    const smuggle = await createCommunity(ada.token, { name: 'Smuggle', owner: ada.user.id, memberCount: 99 });
    expect(smuggle.status).toBe(400);
  });
});

describe('updates and delete', () => {
  it('updates settings and deletes without leaving orphans', async () => {
    const { ada, grace } = await pair();
    await createCommunity(ada.token);
    await client.post(`${API}/communities/analytical-engine/join`).set(authHeader(grace.token));

    const updated = await client
      .put(`${API}/communities/analytical-engine`)
      .set(authHeader(ada.token))
      .send({ description: 'Updated home for computers.', privacy: 'private' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.community.slug).toBe('analytical-engine');
    expect(updated.body.data.community.privacy).toBe('private');

    const deleted = await client
      .delete(`${API}/communities/analytical-engine`)
      .set(authHeader(ada.token));
    expect(deleted.status).toBe(200);

    const missing = await client.get(`${API}/communities/analytical-engine`).set(authHeader(ada.token));
    expect(missing.status).toBe(404);
  });
});
