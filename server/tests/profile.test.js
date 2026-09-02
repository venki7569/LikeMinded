import { describe, expect, it } from 'vitest';
import { API, client, registerUser, validCredentials } from './helpers/testApp.js';

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function registerSecondUser() {
  return registerUser({
    name: 'Grace Hopper',
    username: 'grace',
    email: 'grace@example.com',
    password: 'Passw0rd123',
  });
}

const richProfile = {
  displayName: 'Ada Lovelace',
  bio: 'Mathematician and the first computer programmer. Building tools that match people by meaning.',
  occupation: 'Analytical Engine designer',
  location: { city: 'London', country: 'UK' },
  profileImage: { url: 'https://cdn.example.com/ada.png' },
  coverImage: { url: 'https://cdn.example.com/cover.png' },
  skills: ['Mathematics', 'Programming', 'Poetry'],
  interests: ['Computing', 'Music', 'Flight'],
  education: [{ school: 'Home educated', degree: '', fieldOfStudy: 'Mathematics', startYear: 1833 }],
  experience: [
    {
      company: 'Babbage Laboratory',
      title: 'Collaborator',
      isCurrent: false,
      startDate: '1842-01-01',
      endDate: '1843-12-31',
      description: 'Notes on the Analytical Engine.',
    },
  ],
  projects: [
    {
      title: 'Notes on the Analytical Engine',
      description: 'The first published computer algorithm.',
      url: 'https://example.com/notes',
      technologies: ['Maths'],
    },
  ],
  socials: {
    github: 'https://github.com/ada',
    linkedin: 'https://www.linkedin.com/in/ada',
    website: 'https://ada.dev',
  },
  profileVisibility: 'public',
};

describe('GET /users/me/profile', () => {
  it('requires authentication', async () => {
    const response = await client.get(`${API}/users/me/profile`);
    expect(response.status).toBe(401);
  });

  it('returns the owner profile, including completeness', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .get(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.profile.username).toBe(validCredentials.username);
    expect(response.body.data.profile.email).toBe(validCredentials.email);
    expect(response.body.data.profile.isOwner).toBe(true);
    expect(response.body.data.profile.completeness.percentage).toBeTypeOf('number');
    expect(response.body.data.profile.password).toBeUndefined();
  });
});

describe('PUT /users/me/profile', () => {
  it('updates display name, bio, images, tags and nested sections', async () => {
    const { response: created } = await registerUser();
    const token = created.body.data.accessToken;

    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(token))
      .send(richProfile);

    expect(response.status).toBe(200);
    const { profile } = response.body.data;
    expect(profile.displayName).toBe('Ada Lovelace');
    expect(profile.name).toBe('Ada Lovelace');
    expect(profile.bio).toMatch(/Mathematician/);
    expect(profile.profileImage.url).toBe('https://cdn.example.com/ada.png');
    expect(profile.profileImage.publicId).toBe('');
    expect(profile.skills).toEqual(['mathematics', 'programming', 'poetry']);
    expect(profile.education).toHaveLength(1);
    expect(profile.experience[0].company).toBe('Babbage Laboratory');
    expect(profile.projects[0].url).toBe('https://example.com/notes');
    expect(profile.completeness.percentage).toBe(100);
    expect(profile.embeddingSource).toContain('Analytical Engine');
  });

  it('strips HTML from free text', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ bio: '<script>alert(1)</script> Hello from Ada Lovelace here.' });

    expect(response.status).toBe(200);
    expect(response.body.data.profile.bio).toBe('alert(1) Hello from Ada Lovelace here.');
    expect(response.body.data.profile.bio).not.toContain('<script>');
  });

  it('rejects a javascript: image URL', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ profileImage: { url: 'javascript:alert(1)' } });

    expect(response.status).toBe(400);
  });

  it('rejects more than 20 skills', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ skills: Array.from({ length: 21 }, (_, i) => `skill${i}`) });

    expect(response.status).toBe(400);
  });

  it('rejects education whose end year precedes its start year', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({
        education: [{ school: 'College', startYear: 2020, endYear: 2018 }],
      });

    expect(response.status).toBe(400);
  });

  it('rejects unknown fields so a client cannot set role', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ role: 'admin', bio: 'Trying to escalate.' });

    expect(response.status).toBe(400);

    const me = await client
      .get(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken));
    expect(me.body.data.profile.role).toBe('user');
  });

  it('renames a username when it is free and rejects when it is taken', async () => {
    const { response: ada } = await registerUser();
    await registerSecondUser();

    const taken = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(ada.body.data.accessToken))
      .send({ username: 'grace' });
    expect(taken.status).toBe(409);

    const reserved = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(ada.body.data.accessToken))
      .send({ username: 'admin' });
    expect(reserved.status).toBe(400);

    const renamed = await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(ada.body.data.accessToken))
      .send({ username: 'ada_l' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.profile.username).toBe('ada_l');
  });

  it('requires authentication', async () => {
    const response = await client.put(`${API}/users/me/profile`).send({ bio: 'nope' });
    expect(response.status).toBe(401);
  });
});

describe('PATCH /users/me/skills and /interests', () => {
  it('replaces the skills list', async () => {
    const { response: created } = await registerUser();
    const token = created.body.data.accessToken;

    const response = await client
      .patch(`${API}/users/me/skills`)
      .set(authHeader(token))
      .send({ skills: ['React', 'react', 'Node'] });

    expect(response.status).toBe(200);
    expect(response.body.data.profile.skills).toEqual(['react', 'node']);
  });

  it('replaces the interests list', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .patch(`${API}/users/me/interests`)
      .set(authHeader(created.body.data.accessToken))
      .send({ interests: ['AI', 'Startups'] });

    expect(response.status).toBe(200);
    expect(response.body.data.profile.interests).toEqual(['ai', 'startups']);
  });
});

describe('GET /users/:username', () => {
  it('returns a public profile without an email address', async () => {
    const { response: created } = await registerUser();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ bio: 'A public bio that is long enough to count.' });

    const response = await client.get(`${API}/users/${validCredentials.username}`);
    expect(response.status).toBe(200);
    expect(response.body.data.profile.username).toBe(validCredentials.username);
    expect(response.body.data.profile.email).toBeUndefined();
    expect(response.body.data.profile.isOwner).toBe(false);
  });

  it('hides a private profile from other people and shows it to its owner', async () => {
    const { response: ada } = await registerUser();
    const { response: grace } = await registerSecondUser();

    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(ada.body.data.accessToken))
      .send({ profileVisibility: 'private' });

    const asStranger = await client
      .get(`${API}/users/${validCredentials.username}`)
      .set(authHeader(grace.body.data.accessToken));
    expect(asStranger.status).toBe(403);

    const anonymous = await client.get(`${API}/users/${validCredentials.username}`);
    expect(anonymous.status).toBe(403);

    const asOwner = await client
      .get(`${API}/users/${validCredentials.username}`)
      .set(authHeader(ada.body.data.accessToken));
    expect(asOwner.status).toBe(200);
    expect(asOwner.body.data.profile.isOwner).toBe(true);
  });

  it('returns 404 for an unknown username', async () => {
    const response = await client.get(`${API}/users/nobody_here`);
    expect(response.status).toBe(404);
  });
});

describe('GET /users/check-username/:username', () => {
  it('reports a free username as available', async () => {
    const response = await client.get(`${API}/users/check-username/brandnew`);
    expect(response.status).toBe(200);
    expect(response.body.data.available).toBe(true);
  });

  it('reports a taken username as unavailable', async () => {
    await registerUser();
    const response = await client.get(`${API}/users/check-username/${validCredentials.username}`);
    expect(response.status).toBe(200);
    expect(response.body.data.available).toBe(false);
    expect(response.body.data.reason).toBe('taken');
  });

  it('treats the caller\'s current username as available', async () => {
    const { response: created } = await registerUser();
    const response = await client
      .get(`${API}/users/check-username/${validCredentials.username}`)
      .set(authHeader(created.body.data.accessToken));

    expect(response.body.data.available).toBe(true);
    expect(response.body.data.reason).toBe('current');
  });

  it('treats reserved names as unavailable', async () => {
    const response = await client.get(`${API}/users/check-username/admin`);
    expect(response.body.data.available).toBe(false);
    expect(response.body.data.reason).toBe('reserved');
  });
});

describe('GET /users/me/profile-completeness', () => {
  it('starts low and rises after the profile is filled in', async () => {
    const { response: created } = await registerUser();
    const token = created.body.data.accessToken;

    const before = await client.get(`${API}/users/me/profile-completeness`).set(authHeader(token));
    expect(before.status).toBe(200);
    expect(before.body.data.completeness.percentage).toBeLessThan(20);

    await client.put(`${API}/users/me/profile`).set(authHeader(token)).send(richProfile);

    const after = await client.get(`${API}/users/me/profile-completeness`).set(authHeader(token));
    expect(after.body.data.completeness.percentage).toBe(100);
    expect(after.body.data.completeness.missing).toEqual([]);
  });

  it('requires authentication', async () => {
    const response = await client.get(`${API}/users/me/profile-completeness`);
    expect(response.status).toBe(401);
  });
});

describe('Auth still works alongside profiles', () => {
  it('lets a user sign in after updating their profile', async () => {
    const { response: created } = await registerUser();
    await client
      .put(`${API}/users/me/profile`)
      .set(authHeader(created.body.data.accessToken))
      .send({ bio: 'Still the same credentials after this update here.' });

    const login = await client
      .post(`${API}/auth/login`)
      .send({ identifier: validCredentials.email, password: validCredentials.password });

    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTypeOf('string');
  });
});
