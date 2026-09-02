import { describe, expect, it } from 'vitest';
import { API, client, registerUser } from './helpers/testApp.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function signup(overrides) {
  const { response } = await registerUser(overrides);
  expect(response.status).toBe(201);
  return {
    token: response.body.data.accessToken,
    user: response.body.data.user,
  };
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

async function sendRequest(token, userId) {
  return client.post(`${API}/connections/requests`).set(authHeader(token)).send({ userId });
}

async function connect(ada, grace) {
  const sent = await sendRequest(ada.token, grace.user.id);
  expect(sent.status).toBe(201);
  const requestId = sent.body.data.request.id ?? sent.body.data.request._id;
  const accepted = await client
    .post(`${API}/connections/requests/${requestId}/accept`)
    .set(authHeader(grace.token));
  expect(accepted.status).toBe(200);
  return requestId;
}

describe('authentication', () => {
  it('rejects unauthenticated connection and discovery calls with 401', async () => {
    const id = '665f1c4e8b1f4c0012a3b456';
    const unauthenticated = await Promise.all([
      client.post(`${API}/connections/requests`).send({ userId: id }),
      client.get(`${API}/connections/requests/incoming`),
      client.get(`${API}/connections/requests/outgoing`),
      client.get(`${API}/connections`),
      client.get(`${API}/connections/status/${id}`),
      client.get(`${API}/connections/blocks`),
      client.get(`${API}/people`),
    ]);
    for (const response of unauthenticated) {
      expect(response.status).toBe(401);
    }
  });
});

describe('connection requests', () => {
  it('sends a request and reports outgoing_pending', async () => {
    const { ada, grace } = await pair();
    const response = await sendRequest(ada.token, grace.user.id);

    expect(response.status).toBe(201);
    expect(response.body.data.request.status).toBe('pending');
    expect(response.body.data.relationship.status).toBe('outgoing_pending');

    const status = await client
      .get(`${API}/connections/status/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(status.body.data.relationship.status).toBe('outgoing_pending');
    expect(status.body.data.relationship.requestId).toBeTruthy();

    const incomingForGrace = await client
      .get(`${API}/connections/status/${ada.user.id}`)
      .set(authHeader(grace.token));
    expect(incomingForGrace.body.data.relationship.status).toBe('incoming_pending');
  });

  it('rejects a request to yourself', async () => {
    const ada = await signup();
    const response = await sendRequest(ada.token, ada.user.id);
    expect(response.status).toBe(400);
  });

  it('rejects a duplicate pending request', async () => {
    const { ada, grace } = await pair();
    expect((await sendRequest(ada.token, grace.user.id)).status).toBe(201);
    const duplicate = await sendRequest(ada.token, grace.user.id);
    expect(duplicate.status).toBe(409);
  });

  it('accepts a reciprocal send instead of creating a second pending request', async () => {
    const { ada, grace } = await pair();
    expect((await sendRequest(ada.token, grace.user.id)).status).toBe(201);
    const reciprocal = await sendRequest(grace.token, ada.user.id);
    expect(reciprocal.status).toBe(200);
    expect(reciprocal.body.data.relationship.status).toBe('connected');
  });

  it('rejects a request to an already connected user', async () => {
    const { ada, grace } = await pair();
    await connect(ada, grace);
    const again = await sendRequest(ada.token, grace.user.id);
    expect(again.status).toBe(409);
  });

  it('accepts an incoming request', async () => {
    const { ada, grace } = await pair();
    const sent = await sendRequest(ada.token, grace.user.id);
    const requestId = sent.body.data.request.id;
    const accepted = await client
      .post(`${API}/connections/requests/${requestId}/accept`)
      .set(authHeader(grace.token));
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.relationship.status).toBe('connected');
  });

  it('rejects an incoming request', async () => {
    const { ada, grace } = await pair();
    const sent = await sendRequest(ada.token, grace.user.id);
    const requestId = sent.body.data.request.id;
    const rejected = await client
      .post(`${API}/connections/requests/${requestId}/reject`)
      .set(authHeader(grace.token));
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.relationship.status).toBe('none');
  });

  it('cancels an outgoing request', async () => {
    const { ada, grace } = await pair();
    const sent = await sendRequest(ada.token, grace.user.id);
    const requestId = sent.body.data.request.id;
    const cancelled = await client
      .post(`${API}/connections/requests/${requestId}/cancel`)
      .set(authHeader(ada.token));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.relationship.status).toBe('none');
  });

  it('forbids accepting someone else’s request', async () => {
    const { ada, grace } = await pair();
    const outsider = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });
    const sent = await sendRequest(ada.token, grace.user.id);
    const response = await client
      .post(`${API}/connections/requests/${sent.body.data.request.id}/accept`)
      .set(authHeader(outsider.token));
    expect(response.status).toBe(403);
  });

  it('forbids rejecting someone else’s request', async () => {
    const { ada, grace } = await pair();
    const outsider = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });
    const sent = await sendRequest(ada.token, grace.user.id);
    const response = await client
      .post(`${API}/connections/requests/${sent.body.data.request.id}/reject`)
      .set(authHeader(outsider.token));
    expect(response.status).toBe(403);
  });

  it('forbids cancelling someone else’s request', async () => {
    const { ada, grace } = await pair();
    const sent = await sendRequest(ada.token, grace.user.id);
    const response = await client
      .post(`${API}/connections/requests/${sent.body.data.request.id}/cancel`)
      .set(authHeader(grace.token));
    expect(response.status).toBe(403);
  });
});

describe('connections', () => {
  it('lists accepted connections', async () => {
    const { ada, grace } = await pair();
    await connect(ada, grace);

    const list = await client.get(`${API}/connections`).set(authHeader(ada.token));
    expect(list.status).toBe(200);
    expect(list.body.data.connections).toHaveLength(1);
    expect(list.body.data.connections[0].user.username).toBe('grace');
    expect(list.body.data.connections[0].user.email).toBeUndefined();
    expect(list.body.meta.total).toBe(1);
  });

  it('removes a connection', async () => {
    const { ada, grace } = await pair();
    await connect(ada, grace);

    const removed = await client
      .delete(`${API}/connections/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.relationship.status).toBe('none');

    const list = await client.get(`${API}/connections`).set(authHeader(ada.token));
    expect(list.body.data.connections).toHaveLength(0);
  });

  it('forbids removing a connection you are not part of', async () => {
    const { ada, grace } = await pair();
    await connect(ada, grace);
    const outsider = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });
    const response = await client
      .delete(`${API}/connections/${grace.user.id}`)
      .set(authHeader(outsider.token));
    expect(response.status).toBe(404);
  });

  it('returns relationship status connected after accept', async () => {
    const { ada, grace } = await pair();
    await connect(ada, grace);
    const status = await client
      .get(`${API}/connections/status/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(status.status).toBe(200);
    expect(status.body.data.relationship.status).toBe('connected');
  });
});

describe('blocking', () => {
  it('blocks, lists, and unblocks a user', async () => {
    const { ada, grace } = await pair();
    const blocked = await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    expect(blocked.status).toBe(200);
    expect(blocked.body.data.relationship.status).toBe('blocked');

    const list = await client.get(`${API}/connections/blocks`).set(authHeader(ada.token));
    expect(list.body.data.blocked).toHaveLength(1);
    expect(list.body.data.blocked[0].user.username).toBe('grace');
    expect(list.body.data.blocked[0].user.email).toBeUndefined();

    const unblocked = await client
      .delete(`${API}/connections/blocks/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(unblocked.status).toBe(200);
    expect(unblocked.body.data.relationship.status).toBe('none');
  });

  it('cancels a pending request when blocking', async () => {
    const { ada, grace } = await pair();
    await sendRequest(ada.token, grace.user.id);
    await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });

    const incoming = await client
      .get(`${API}/connections/requests/incoming`)
      .set(authHeader(grace.token));
    expect(incoming.body.data.requests).toHaveLength(0);
  });

  it('prevents a blocked user from sending a connection request either way', async () => {
    const { ada, grace } = await pair();
    await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });

    expect((await sendRequest(ada.token, grace.user.id)).status).toBe(403);
    expect((await sendRequest(grace.token, ada.user.id)).status).toBe(403);
  });

  it('does not let a blocked user view the blocker profile or appear in discovery', async () => {
    const { ada, grace } = await pair();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(grace.token))
      .send({ occupation: 'Rear Admiral', skills: ['cobol'], location: { city: 'Arlington', country: 'US' } });

    await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });

    const profile = await client.get(`${API}/users/ada`).set(authHeader(grace.token));
    expect(profile.status).toBe(404);

    const peopleForAda = await client.get(`${API}/people`).set(authHeader(ada.token));
    expect(peopleForAda.body.data.people.map((item) => item.user.username)).not.toContain('grace');

    const peopleForGrace = await client.get(`${API}/people`).set(authHeader(grace.token));
    expect(peopleForGrace.body.data.people.map((item) => item.user.username)).not.toContain('ada');
  });

  it('forbids unblocking on someone else’s behalf', async () => {
    const { ada, grace } = await pair();
    await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    const response = await client
      .delete(`${API}/connections/blocks/${grace.user.id}`)
      .set(authHeader(grace.token));
    expect(response.status).toBe(404);
  });

  it('allows a new request after unblock', async () => {
    const { ada, grace } = await pair();
    await client
      .post(`${API}/connections/blocks`)
      .set(authHeader(ada.token))
      .send({ userId: grace.user.id });
    await client.delete(`${API}/connections/blocks/${grace.user.id}`).set(authHeader(ada.token));
    expect((await sendRequest(ada.token, grace.user.id)).status).toBe(201);
  });
});

describe('discovery', () => {
  it('searches by username and name without exposing email', async () => {
    const { ada, grace } = await pair();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(grace.token))
      .send({
        occupation: 'Computer scientist',
        skills: ['cobol', 'compilers'],
        interests: ['navy', 'systems'],
        location: { city: 'Arlington', country: 'US' },
      });

    const byUsername = await client.get(`${API}/people?q=grace`).set(authHeader(ada.token));
    expect(byUsername.status).toBe(200);
    expect(byUsername.body.data.people).toHaveLength(1);
    expect(byUsername.body.data.people[0].user.username).toBe('grace');
    expect(byUsername.body.data.people[0].user.email).toBeUndefined();
    expect(byUsername.body.data.people[0].relationshipStatus).toBe('none');

    const byName = await client.get(`${API}/people?q=Hopper`).set(authHeader(ada.token));
    expect(byName.body.data.people[0].user.displayName).toMatch(/Hopper/);
  });

  it('filters by skills, interests, occupation and location', async () => {
    const { ada, grace } = await pair();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(grace.token))
      .send({
        occupation: 'Computer scientist',
        skills: ['cobol', 'compilers'],
        interests: ['navy', 'systems'],
        location: { city: 'Arlington', country: 'US' },
      });
    await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });

    const bySkill = await client.get(`${API}/people?skill=cobol`).set(authHeader(ada.token));
    expect(bySkill.body.data.people.map((item) => item.user.username)).toEqual(['grace']);

    const byInterest = await client.get(`${API}/people?interest=navy`).set(authHeader(ada.token));
    expect(byInterest.body.data.people.map((item) => item.user.username)).toEqual(['grace']);

    const byOccupation = await client
      .get(`${API}/people?occupation=scientist`)
      .set(authHeader(ada.token));
    expect(byOccupation.body.data.people.map((item) => item.user.username)).toEqual(['grace']);

    const byCity = await client.get(`${API}/people?city=Arlington`).set(authHeader(ada.token));
    expect(byCity.body.data.people.map((item) => item.user.username)).toEqual(['grace']);
  });

  it('paginates discovery results', async () => {
    const ada = await signup();
    await signup({ name: 'Grace Hopper', username: 'grace', email: 'grace@example.com', password: 'Passw0rd123' });
    await signup({ name: 'Alan Turing', username: 'alan', email: 'alan@example.com', password: 'Passw0rd123' });
    await signup({ name: 'Katherine Johnson', username: 'katherine', email: 'kat@example.com', password: 'Passw0rd123' });

    const page1 = await client.get(`${API}/people?limit=2&page=1`).set(authHeader(ada.token));
    expect(page1.status).toBe(200);
    expect(page1.body.data.people).toHaveLength(2);
    expect(page1.body.meta.total).toBe(3);
    expect(page1.body.meta.hasNextPage).toBe(true);

    const page2 = await client.get(`${API}/people?limit=2&page=2`).set(authHeader(ada.token));
    expect(page2.body.data.people).toHaveLength(1);
    expect(page2.body.meta.hasNextPage).toBe(false);
  });

  it('hides private profiles unless the viewer is connected', async () => {
    const { ada, grace } = await pair();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(grace.token))
      .send({ profileVisibility: 'private' });

    const before = await client.get(`${API}/people?q=grace`).set(authHeader(ada.token));
    expect(before.body.data.people).toHaveLength(0);

    const publicProfile = await client.get(`${API}/users/grace`).set(authHeader(ada.token));
    expect(publicProfile.status).toBe(403);

    await connect(ada, grace);

    const after = await client.get(`${API}/people?q=grace`).set(authHeader(ada.token));
    expect(after.body.data.people).toHaveLength(1);

    const connectedProfile = await client.get(`${API}/users/grace`).set(authHeader(ada.token));
    expect(connectedProfile.status).toBe(200);
    expect(connectedProfile.body.data.profile.email).toBeUndefined();
  });
});

describe('mutual connections', () => {
  it('counts a shared connection and reports zero when there is none', async () => {
    const { ada, grace } = await pair();
    const alan = await signup({
      name: 'Alan Turing',
      username: 'alan',
      email: 'alan@example.com',
      password: 'Passw0rd123',
    });

    await connect(ada, alan);
    await connect(grace, alan);

    const withMutual = await client
      .get(`${API}/connections/status/${grace.user.id}`)
      .set(authHeader(ada.token));
    expect(withMutual.body.data.relationship.mutualConnectionCount).toBe(1);

    const people = await client.get(`${API}/people?q=grace`).set(authHeader(ada.token));
    expect(people.body.data.people[0].mutualConnectionCount).toBe(1);

    const outsider = await signup({
      name: 'Katherine Johnson',
      username: 'katherine',
      email: 'kat@example.com',
      password: 'Passw0rd123',
    });
    const zero = await client
      .get(`${API}/connections/status/${outsider.user.id}`)
      .set(authHeader(ada.token));
    expect(zero.body.data.relationship.mutualConnectionCount).toBe(0);
  });
});
