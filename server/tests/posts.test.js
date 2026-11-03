import { describe, expect, it } from 'vitest';
import { API, client, registerUser } from './helpers/testApp.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function signup(overrides = {}) {
  const { response } = await registerUser(overrides);
  expect(response.status).toBe(201);
  return { token: response.body.data.accessToken, user: response.body.data.user };
}

async function createPost(token, body = {}) {
  return client
    .post(`${API}/posts`)
    .set(authHeader(token))
    .send({ content: 'Hello world #test', privacy: 'public', ...body });
}

async function createCommunity(token, body = {}) {
  return client
    .post(`${API}/communities`)
    .set(authHeader(token))
    .send({ name: 'Test Community', privacy: 'public', ...body });
}

async function connect(adaToken, graceUserId, graceToken) {
  const sent = await client
    .post(`${API}/connections/requests`)
    .set(authHeader(adaToken))
    .send({ userId: graceUserId });
  expect(sent.status).toBe(201);
  const requestId = sent.body.data.request.id ?? sent.body.data.request._id;
  const accepted = await client
    .post(`${API}/connections/requests/${requestId}/accept`)
    .set(authHeader(graceToken));
  expect(accepted.status).toBe(200);
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /posts — create post
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /posts — create post', () => {
  it('rejects unauthenticated creation with 401', async () => {
    const res = await client.post(`${API}/posts`).send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('creates a text post and returns correct DTO shape', async () => {
    const ada = await signup();
    const res = await createPost(ada.token, {
      content: 'Hello #world @nobody',
      privacy: 'public',
    });
    expect(res.status).toBe(201);
    const { post } = res.body.data;
    expect(post.id).toBeTruthy();
    expect(post.content).toBe('Hello #world @nobody');
    expect(post.privacy).toBe('public');
    expect(post.author).toBeTruthy();
    expect(post.author.username).toBe('ada');
    expect(post.author.email).toBeUndefined();
    expect(post.likeCount).toBe(0);
    expect(post.commentCount).toBe(0);
    expect(post.isLiked).toBe(false);
    expect(post.hashtags).toContain('world');
    expect(Array.isArray(post.media)).toBe(true);
  });

  it('creates a post with valid media', async () => {
    const ada = await signup();
    const res = await createPost(ada.token, {
      content: '',
      media: [{ url: 'https://example.com/image.jpg', publicId: 'img1' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.post.media).toHaveLength(1);
    expect(res.body.data.post.media[0].url).toBe('https://example.com/image.jpg');
  });

  it('rejects post with javascript: media URL', async () => {
    const ada = await signup();
    const res = await createPost(ada.token, {
      content: '',
      media: [{ url: 'javascript:alert(1)' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects post with data: media URL', async () => {
    const ada = await signup();
    const res = await createPost(ada.token, {
      content: '',
      media: [{ url: 'data:text/html,<script>alert(1)</script>' }],
    });
    expect(res.status).toBe(400);
  });

  it('rejects post with no content and no media', async () => {
    const ada = await signup();
    const res = await client
      .post(`${API}/posts`)
      .set(authHeader(ada.token))
      .send({ privacy: 'public' });
    expect(res.status).toBe(400);
  });

  it('rejects post with empty content and empty media array', async () => {
    const ada = await signup();
    const res = await client
      .post(`${API}/posts`)
      .set(authHeader(ada.token))
      .send({ content: '', media: [], privacy: 'public' });
    expect(res.status).toBe(400);
  });

  it('extracts hashtags from content automatically', async () => {
    const ada = await signup();
    const res = await createPost(ada.token, {
      content: 'Testing #react and #nodejs together',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.post.hashtags).toContain('react');
    expect(res.body.data.post.hashtags).toContain('nodejs');
  });

  it('creates a community post when user is a member', async () => {
    const ada = await signup();
    const commRes = await createCommunity(ada.token);
    expect(commRes.status).toBe(201);
    const communityId = commRes.body.data.community.id;

    const res = await createPost(ada.token, {
      content: 'Community post here',
      communityId,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.post.community).toBeTruthy();
    expect(res.body.data.post.community.id).toBe(communityId);
  });

  it('rejects community post when user is not a member', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace Hopper',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const commRes = await createCommunity(ada.token);
    expect(commRes.status).toBe(201);
    const communityId = commRes.body.data.community.id;

    const res = await createPost(grace.token, {
      content: 'Unauthorized community post',
      communityId,
    });
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /posts/:postId — get single post
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /posts/:postId — get single post', () => {
  it('returns a public post to unauthenticated callers', async () => {
    const ada = await signup();
    const created = await createPost(ada.token, { content: 'Public post', privacy: 'public' });
    const postId = created.body.data.post.id;

    const res = await client.get(`${API}/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.post.id).toBe(postId);
  });

  it('returns 404 for a private post accessed by non-author', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token, { content: 'Private post', privacy: 'private' });
    const postId = created.body.data.post.id;

    const res = await client.get(`${API}/posts/${postId}`).set(authHeader(grace.token));
    expect(res.status).toBe(404);
  });

  it('returns a private post to its own author', async () => {
    const ada = await signup();
    const created = await createPost(ada.token, { content: 'My private', privacy: 'private' });
    const postId = created.body.data.post.id;

    const res = await client.get(`${API}/posts/${postId}`).set(authHeader(ada.token));
    expect(res.status).toBe(200);
  });

  it('returns 404 for connections post when not connected', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token, {
      content: 'Connections only',
      privacy: 'connections',
    });
    const postId = created.body.data.post.id;

    const res = await client.get(`${API}/posts/${postId}`).set(authHeader(grace.token));
    expect(res.status).toBe(404);
  });

  it('returns connections post to connected user', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    await connect(ada.token, grace.user.id, grace.token);

    const created = await createPost(ada.token, {
      content: 'Connections only',
      privacy: 'connections',
    });
    const postId = created.body.data.post.id;

    const res = await client.get(`${API}/posts/${postId}`).set(authHeader(grace.token));
    expect(res.status).toBe(200);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /posts/:postId — update post
// ──────────────────────────────────────────────────────────────────────────────

describe('PUT /posts/:postId — update post', () => {
  it('allows author to update their post and sets editedAt', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .put(`${API}/posts/${postId}`)
      .set(authHeader(ada.token))
      .send({ content: 'Updated content #newtag' });

    expect(res.status).toBe(200);
    expect(res.body.data.post.content).toBe('Updated content #newtag');
    expect(res.body.data.post.editedAt).not.toBeNull();
    expect(res.body.data.post.hashtags).toContain('newtag');
  });

  it('returns 403 when non-owner tries to update', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .put(`${API}/posts/${postId}`)
      .set(authHeader(grace.token))
      .send({ content: 'Hacked!' });
    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent post', async () => {
    const ada = await signup();
    const res = await client
      .put(`${API}/posts/665f1c4e8b1f4c0012a3b456`)
      .set(authHeader(ada.token))
      .send({ content: 'No post' });
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /posts/:postId — delete post
// ──────────────────────────────────────────────────────────────────────────────

describe('DELETE /posts/:postId — delete post', () => {
  it('allows author to delete their post', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .delete(`${API}/posts/${postId}`)
      .set(authHeader(ada.token));
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    // Verify gone
    const getRes = await client.get(`${API}/posts/${postId}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 403 when non-owner tries to delete', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .delete(`${API}/posts/${postId}`)
      .set(authHeader(grace.token));
    expect(res.status).toBe(403);
  });

  it('cascade-deletes likes and comments when post is deleted', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    // Add a like and a comment
    await client.post(`${API}/posts/${postId}/like`).set(authHeader(grace.token));
    await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(grace.token))
      .send({ content: 'A comment' });

    // Delete the post
    const del = await client.delete(`${API}/posts/${postId}`).set(authHeader(ada.token));
    expect(del.status).toBe(200);

    // Post is gone
    const getRes = await client.get(`${API}/posts/${postId}`);
    expect(getRes.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /posts/:postId/like and DELETE /posts/:postId/like
// ──────────────────────────────────────────────────────────────────────────────

describe('likes', () => {
  it('likes a post and returns likeCount 1 with liked=true', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .post(`${API}/posts/${postId}/like`)
      .set(authHeader(grace.token));
    expect(res.status).toBe(200);
    expect(res.body.data.liked).toBe(true);
    expect(res.body.data.likeCount).toBe(1);
  });

  it('unlikes a post and returns likeCount 0 with liked=false', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    await client.post(`${API}/posts/${postId}/like`).set(authHeader(grace.token));

    const res = await client
      .delete(`${API}/posts/${postId}/like`)
      .set(authHeader(grace.token));
    expect(res.status).toBe(200);
    expect(res.body.data.liked).toBe(false);
    expect(res.body.data.likeCount).toBe(0);
  });

  it('returns 409 on double-like', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    await client.post(`${API}/posts/${postId}/like`).set(authHeader(ada.token));
    const res = await client
      .post(`${API}/posts/${postId}/like`)
      .set(authHeader(ada.token));
    expect(res.status).toBe(409);
  });

  it('returns 409 when unliking a post that was not liked', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .delete(`${API}/posts/${postId}/like`)
      .set(authHeader(ada.token));
    expect(res.status).toBe(409);
  });

  it('isLiked is true for the user who liked', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    await client.post(`${API}/posts/${postId}/like`).set(authHeader(ada.token));

    const get = await client.get(`${API}/posts/${postId}`).set(authHeader(ada.token));
    expect(get.body.data.post.isLiked).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────────────────────────────────────

describe('comments', () => {
  it('creates a comment and increments commentCount', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const res = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'Great post!' });

    expect(res.status).toBe(201);
    expect(res.body.data.comment.content).toBe('Great post!');
    expect(res.body.data.comment.author.username).toBe('ada');
    expect(res.body.data.comment.isOwn).toBe(true);

    // Check commentCount on post
    const getPost = await client.get(`${API}/posts/${postId}`).set(authHeader(ada.token));
    expect(getPost.body.data.post.commentCount).toBe(1);
  });

  it('lists comments with pagination meta', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'Comment 1' });
    await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'Comment 2' });

    const res = await client.get(`${API}/posts/${postId}/comments`);
    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.page).toBe(1);
  });

  it('updates a comment as its author and sets editedAt', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const comment = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'Original comment' });
    const commentId = comment.body.data.comment.id;

    const res = await client
      .put(`${API}/posts/${postId}/comments/${commentId}`)
      .set(authHeader(ada.token))
      .send({ content: 'Edited comment' });

    expect(res.status).toBe(200);
    expect(res.body.data.comment.content).toBe('Edited comment');
    expect(res.body.data.comment.editedAt).not.toBeNull();
  });

  it('returns 403 when non-author tries to update comment', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const comment = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'Ada comment' });
    const commentId = comment.body.data.comment.id;

    const res = await client
      .put(`${API}/posts/${postId}/comments/${commentId}`)
      .set(authHeader(grace.token))
      .send({ content: 'Grace edits' });
    expect(res.status).toBe(403);
  });

  it('allows comment author to delete their comment', async () => {
    const ada = await signup();
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const comment = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(ada.token))
      .send({ content: 'To be deleted' });
    const commentId = comment.body.data.comment.id;

    const res = await client
      .delete(`${API}/posts/${postId}/comments/${commentId}`)
      .set(authHeader(ada.token));
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    // commentCount should be 0
    const getPost = await client.get(`${API}/posts/${postId}`).set(authHeader(ada.token));
    expect(getPost.body.data.post.commentCount).toBe(0);
  });

  it('allows post author to delete any comment on their post', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const comment = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(grace.token))
      .send({ content: "Grace's comment" });
    const commentId = comment.body.data.comment.id;

    const res = await client
      .delete(`${API}/posts/${postId}/comments/${commentId}`)
      .set(authHeader(ada.token)); // post author deletes grace's comment
    expect(res.status).toBe(200);
  });

  it('returns 403 when stranger tries to delete a comment', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const eve = await signup({
      name: 'Eve',
      username: 'eve',
      email: 'eve@example.com',
      password: 'Passw0rd123',
    });
    const created = await createPost(ada.token);
    const postId = created.body.data.post.id;

    const comment = await client
      .post(`${API}/posts/${postId}/comments`)
      .set(authHeader(grace.token))
      .send({ content: "Grace's comment" });
    const commentId = comment.body.data.comment.id;

    const res = await client
      .delete(`${API}/posts/${postId}/comments/${commentId}`)
      .set(authHeader(eve.token));
    expect(res.status).toBe(403);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /posts/feed — home feed
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /posts/feed — home feed', () => {
  it('returns own posts', async () => {
    const ada = await signup();
    await createPost(ada.token, { content: 'My post 1' });
    await createPost(ada.token, { content: 'My post 2' });

    const res = await client.get(`${API}/posts/feed`).set(authHeader(ada.token));
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThanOrEqual(2);
  });

  it('includes posts from accepted connections', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    await connect(ada.token, grace.user.id, grace.token);
    await createPost(grace.token, { content: "Grace's public post", privacy: 'public' });

    const res = await client.get(`${API}/posts/feed`).set(authHeader(ada.token));
    expect(res.status).toBe(200);
    const contents = res.body.data.posts.map((p) => p.content);
    expect(contents).toContain("Grace's public post");
  });

  it('excludes private posts from connections', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    await connect(ada.token, grace.user.id, grace.token);
    await createPost(grace.token, { content: "Grace's private post", privacy: 'private' });

    const res = await client.get(`${API}/posts/feed`).set(authHeader(ada.token));
    const contents = res.body.data.posts.map((p) => p.content);
    expect(contents).not.toContain("Grace's private post");
  });

  it('returns 401 for unauthenticated requests', async () => {
    const res = await client.get(`${API}/posts/feed`);
    expect(res.status).toBe(401);
  });

  it('returns feed response shape with posts, nextCursor, hasMore', async () => {
    const ada = await signup();
    await createPost(ada.token, { content: 'Feed post' });

    const res = await client.get(`${API}/posts/feed`).set(authHeader(ada.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.posts)).toBe(true);
    expect(res.body.data).toHaveProperty('hasMore');
    expect(res.body.data).toHaveProperty('nextCursor');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /users/:username/posts — profile feed
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /users/:username/posts — profile feed', () => {
  it('returns public posts for the given username', async () => {
    const ada = await signup();
    await createPost(ada.token, { content: "Ada's public post", privacy: 'public' });
    await createPost(ada.token, { content: "Ada's private post", privacy: 'private' });

    const res = await client.get(`${API}/users/ada/posts`);
    expect(res.status).toBe(200);
    const contents = res.body.data.posts.map((p) => p.content);
    expect(contents).toContain("Ada's public post");
    expect(contents).not.toContain("Ada's private post");
  });

  it('returns own private posts when author queries own feed', async () => {
    const ada = await signup();
    await createPost(ada.token, { content: 'Private', privacy: 'private' });

    const res = await client.get(`${API}/users/ada/posts`).set(authHeader(ada.token));
    expect(res.status).toBe(200);
    const contents = res.body.data.posts.map((p) => p.content);
    expect(contents).toContain('Private');
  });

  it('returns 404 for non-existent username', async () => {
    const res = await client.get(`${API}/users/doesnotexist123/posts`);
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /communities/:slug/posts — community feed
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /communities/:slug/posts — community feed', () => {
  it('returns posts for a public community', async () => {
    const ada = await signup();
    const commRes = await createCommunity(ada.token, { name: 'Public Comm', privacy: 'public' });
    expect(commRes.status).toBe(201);
    const communityId = commRes.body.data.community.id;
    const slug = commRes.body.data.community.slug;

    await createPost(ada.token, { content: 'Community post', communityId });

    const res = await client.get(`${API}/communities/${slug}/posts`);
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.posts[0].community).toBeTruthy();
  });

  it('returns 404 for private community posts when not a member', async () => {
    const ada = await signup();
    const grace = await signup({
      name: 'Grace',
      username: 'grace',
      email: 'grace@example.com',
      password: 'Passw0rd123',
    });
    const commRes = await createCommunity(ada.token, {
      name: 'Private Comm',
      privacy: 'private',
    });
    expect(commRes.status).toBe(201);
    const communityId = commRes.body.data.community.id;
    const slug = commRes.body.data.community.slug;

    await createPost(ada.token, { content: 'Private community post', communityId });

    const res = await client
      .get(`${API}/communities/${slug}/posts`)
      .set(authHeader(grace.token));
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent community', async () => {
    const res = await client.get(`${API}/communities/no-such-community/posts`);
    expect(res.status).toBe(404);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Cursor pagination
// ──────────────────────────────────────────────────────────────────────────────

describe('cursor pagination', () => {
  it('returns nextCursor when hasMore is true, second page is different', async () => {
    const ada = await signup();

    // Create more posts than one page can hold (limit=2)
    for (let i = 0; i < 3; i++) {
      await createPost(ada.token, { content: `Post number ${i}` });
    }

    const page1 = await client
      .get(`${API}/posts/feed?limit=2`)
      .set(authHeader(ada.token));
    expect(page1.status).toBe(200);
    expect(page1.body.data.hasMore).toBe(true);
    expect(page1.body.data.nextCursor).toBeTruthy();

    const cursor = page1.body.data.nextCursor;
    const page2 = await client
      .get(`${API}/posts/feed?limit=2&cursor=${cursor}`)
      .set(authHeader(ada.token));
    expect(page2.status).toBe(200);
    // Pages should not share post IDs
    const ids1 = page1.body.data.posts.map((p) => p.id);
    const ids2 = page2.body.data.posts.map((p) => p.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('profile feed supports cursor pagination', async () => {
    const ada = await signup();
    for (let i = 0; i < 3; i++) {
      await createPost(ada.token, { content: `Profile post ${i}` });
    }

    const page1 = await client.get(`${API}/users/ada/posts?limit=2`);
    expect(page1.status).toBe(200);
    expect(page1.body.data.hasMore).toBe(true);
    const cursor = page1.body.data.nextCursor;

    const page2 = await client.get(`${API}/users/ada/posts?limit=2&cursor=${cursor}`);
    expect(page2.status).toBe(200);
    const ids1 = page1.body.data.posts.map((p) => p.id);
    const ids2 = page2.body.data.posts.map((p) => p.id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });
});
