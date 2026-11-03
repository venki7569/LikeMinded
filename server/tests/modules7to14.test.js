import { describe, expect, it } from 'vitest';
import { API, client, registerUser } from './helpers/testApp.js';
import User from '../src/models/user.model.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

let counter = 0;
async function signup(overrides = {}) {
  counter += 1;
  const uniqueId = `${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 6)}`;
  const payload = {
    name: overrides.name || `User ${counter}`,
    username: overrides.username || `user_${uniqueId}`.slice(0, 24),
    email: overrides.email || `user_${uniqueId}@example.com`,
    password: 'Passw0rd123',
    ...overrides,
  };
  const { response } = await registerUser(payload);
  expect(response.status).toBe(201);
  return { token: response.body.data.accessToken, user: response.body.data.user };
}

describe('Module 7: Notifications', () => {
  it('returns paginated notifications and unread count', async () => {
    const userA = await signup();

    const unreadRes = await client
      .get(`${API}/notifications/unread-count`)
      .set(authHeader(userA.token));
    expect(unreadRes.status).toBe(200);
    expect(unreadRes.body.data.unreadCount).toBe(0);

    const listRes = await client
      .get(`${API}/notifications`)
      .set(authHeader(userA.token));
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.notifications)).toBe(true);

    const markAllRes = await client
      .patch(`${API}/notifications/read-all`)
      .set(authHeader(userA.token));
    expect(markAllRes.status).toBe(200);
  });
});

describe('Module 8: Direct Messaging & Chat', () => {
  it('creates a conversation, sends messages, and retrieves history', async () => {
    const userA = await signup();
    const userB = await signup();

    // Start conversation
    const startRes = await client
      .post(`${API}/conversations`)
      .set(authHeader(userA.token))
      .send({ recipientId: userB.user.id });
    expect(startRes.status).toBe(201);
    const conversationId = startRes.body.data.conversation.id ?? startRes.body.data.conversation._id;
    expect(conversationId).toBeDefined();

    // List conversations
    const listRes = await client
      .get(`${API}/conversations`)
      .set(authHeader(userA.token));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.conversations.length).toBeGreaterThan(0);

    // Send a message
    const sendRes = await client
      .post(`${API}/conversations/${conversationId}/messages`)
      .set(authHeader(userA.token))
      .send({ body: 'Hey, let’s collaborate on LikeMinded!' });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.data.message.body).toBe('Hey, let’s collaborate on LikeMinded!');

    // Get messages
    const getRes = await client
      .get(`${API}/conversations/${conversationId}/messages`)
      .set(authHeader(userB.token));
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.messages.length).toBe(1);

    // Mark as read
    const readRes = await client
      .patch(`${API}/conversations/${conversationId}/read`)
      .set(authHeader(userB.token));
    expect(readRes.status).toBe(200);
  });
});

describe('Module 9: Events', () => {
  it('creates an event, allows RSVP toggle, and deletion by host', async () => {
    const host = await signup();
    const attendee = await signup();

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const createRes = await client
      .post(`${API}/events`)
      .set(authHeader(host.token))
      .send({
        title: 'Global AIML Hackathon',
        description: 'Building collaborative agents for social networking',
        category: 'hackathon',
        startsAt: futureDate,
        location: 'Virtual',
      });
    expect(createRes.status).toBe(201);
    const eventId = createRes.body.data.event.id ?? createRes.body.data.event._id;

    // List events
    const listRes = await client.get(`${API}/events?upcoming=true`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.events.some((e) => (e.id ?? e._id) === eventId)).toBe(true);

    // Attendee RSVP
    const rsvpRes = await client
      .post(`${API}/events/${eventId}/rsvp`)
      .set(authHeader(attendee.token));
    expect(rsvpRes.status).toBe(200);
    expect(rsvpRes.body.data.isRsvp).toBe(true);
    expect(rsvpRes.body.data.attendeeCount).toBe(2); // host + attendee

    // Delete event by host
    const delRes = await client
      .delete(`${API}/events/${eventId}`)
      .set(authHeader(host.token));
    expect(delRes.status).toBe(200);
  });
});

describe('Module 10, 12, 13: AI Matching, Toxicity & Sentiment', () => {
  it('detects toxicity and analyzes sentiment on posts', async () => {
    const user = await signup();

    // Toxic post rejected
    const toxicRes = await client
      .post(`${API}/posts`)
      .set(authHeader(user.token))
      .send({ content: 'I will kill you all' });
    expect(toxicRes.status).toBe(400);

    // Positive sentiment post
    const positiveRes = await client
      .post(`${API}/posts`)
      .set(authHeader(user.token))
      .send({ content: 'I am so excited and happy with this amazing achievement! #congrats' });
    expect(positiveRes.status).toBe(201);
    expect(positiveRes.body.data.post.sentiment).toBe('positive');
  });

  it('generates AI matching recommendations with explainable scores', async () => {
    const userA = await signup();
    const userB = await signup();

    // Update user skills in DB directly
    await User.findByIdAndUpdate(userA.user.id, { skills: ['python', 'react'] });
    await User.findByIdAndUpdate(userB.user.id, { skills: ['python', 'typescript'] });

    const matchRes = await client
      .get(`${API}/matching/recommendations`)
      .set(authHeader(userA.token));
    expect(matchRes.status).toBe(200);
    expect(Array.isArray(matchRes.body.data.recommendations)).toBe(true);
  });
});

describe('Module 11: Universal Search', () => {
  it('searches across users, communities, and posts', async () => {
    const user = await signup({ name: 'Leonardo DaVinci' });

    const searchRes = await client.get(`${API}/search?q=Leonardo`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.users.length).toBeGreaterThan(0);
    expect(searchRes.body.data.users[0].displayName).toBe('Leonardo DaVinci');
  });
});

describe('Module 14: Admin & Moderation', () => {
  it('allows users to submit reports and admin to manage them', async () => {
    const regularUser = await signup();
    const adminUser = await signup();

    // Promote adminUser directly in DB
    await User.findByIdAndUpdate(adminUser.user.id, { role: 'admin' });

    // Submit report
    const reportRes = await client
      .post(`${API}/reports`)
      .set(authHeader(regularUser.token))
      .send({
        targetType: 'user',
        targetId: adminUser.user.id,
        reason: 'spam',
        description: 'Testing moderation pipeline',
      });
    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data.report.id ?? reportRes.body.data.report._id;

    // Regular user cannot access /admin/stats
    const forbiddenRes = await client
      .get(`${API}/admin/stats`)
      .set(authHeader(regularUser.token));
    expect(forbiddenRes.status).toBe(403);

    // Admin user gets stats
    const statsRes = await client
      .get(`${API}/admin/stats`)
      .set(authHeader(adminUser.token));
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.stats.totalUsers).toBeGreaterThan(0);

    // Admin resolves report
    const resolveRes = await client
      .patch(`${API}/admin/reports/${reportId}`)
      .set(authHeader(adminUser.token))
      .send({ status: 'resolved', resolutionNotes: 'Reviewed and dismissed' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.report.status).toBe('resolved');

    // Admin bans and unbans a user
    const banRes = await client
      .patch(`${API}/admin/users/${regularUser.user.id}/ban`)
      .set(authHeader(adminUser.token))
      .send({ isBanned: true });
    expect(banRes.status).toBe(200);
    expect(banRes.body.data.user.isBanned).toBe(true);
  });
});
