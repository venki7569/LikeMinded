import { describe, expect, it } from 'vitest';
import { buildEmbeddingSource, scoreProfileCompleteness } from '../../src/utils/profileCompleteness.js';

const empty = {
  bio: '',
  skills: [],
  interests: [],
  occupation: '',
  education: [],
  experience: [],
  projects: [],
  location: {},
  avatar: { url: '' },
  coverImage: { url: '' },
  socials: {},
};

describe('scoreProfileCompleteness', () => {
  it('scores a brand-new account near zero', () => {
    const result = scoreProfileCompleteness(empty);
    expect(result.percentage).toBe(0);
    expect(result.missing).toEqual(
      expect.arrayContaining(['bio', 'skills', 'interests', 'occupation', 'education'])
    );
  });

  it('requires a bio of at least 20 characters', () => {
    expect(scoreProfileCompleteness({ ...empty, bio: 'Too short' }).percentage).toBe(0);
    expect(scoreProfileCompleteness({ ...empty, bio: 'A bio that is definitely long enough.' }).percentage).toBe(15);
  });

  it('requires at least three skills and three interests', () => {
    const two = scoreProfileCompleteness({ ...empty, skills: ['a', 'b'] });
    const three = scoreProfileCompleteness({ ...empty, skills: ['a', 'b', 'c'] });
    expect(two.percentage).toBe(0);
    expect(three.percentage).toBe(15);
  });

  it('reaches 100 when every weighted field is populated', () => {
    const result = scoreProfileCompleteness({
      bio: 'Building tools for people who love both cricket and machine learning.',
      skills: ['react', 'node', 'nlp'],
      interests: ['ai', 'startups', 'cricket'],
      occupation: 'ML engineer',
      education: [{ school: 'IIT' }],
      experience: [{ company: 'Acme', title: 'Engineer' }],
      projects: [{ title: 'LikeMinded' }],
      location: { city: 'Hyderabad' },
      avatar: { url: 'https://cdn.example.com/me.png' },
      coverImage: { url: 'https://cdn.example.com/cover.png' },
      socials: { github: 'https://github.com/ada' },
    });

    expect(result.percentage).toBe(100);
    expect(result.missing).toEqual([]);
  });
});

describe('buildEmbeddingSource', () => {
  it('joins the fields the matcher will embed, skipping empties', () => {
    const text = buildEmbeddingSource({
      bio: 'I love React and AI.',
      occupation: 'Engineer',
      skills: ['react', 'nlp'],
      interests: ['startups'],
      education: [{ school: 'IIT', degree: 'B.Tech', fieldOfStudy: 'CS' }],
      experience: [{ title: 'SWE', company: 'Acme', description: 'Built APIs' }],
      projects: [{ title: 'Bot', description: 'Chat', technologies: ['python'] }],
    });

    expect(text).toContain('I love React and AI.');
    expect(text).toContain('react, nlp');
    expect(text).toContain('IIT');
    expect(text).toContain('SWE');
    expect(text).toContain('Bot');
    expect(text).not.toMatch(/^\n/);
  });
});
