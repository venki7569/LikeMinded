/**
 * Weighted completeness for the profile editor and the future matching pipeline.
 * Fields that feed embeddings (bio, skills, interests, occupation, education,
 * experience, projects) carry more weight than decorative ones.
 */
export const COMPLETENESS_WEIGHTS = Object.freeze({
  bio: 15,
  skills: 15,
  interests: 15,
  occupation: 10,
  education: 10,
  experience: 10,
  projects: 10,
  location: 5,
  profileImage: 5,
  socials: 3,
  coverImage: 2,
});

const TOTAL_WEIGHT = Object.values(COMPLETENESS_WEIGHTS).reduce((sum, value) => sum + value, 0);

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function filled(checks) {
  return Object.entries(COMPLETENESS_WEIGHTS).map(([field, weight]) => ({
    field,
    weight,
    complete: Boolean(checks[field]),
  }));
}

export function scoreProfileCompleteness(user = {}) {
  const location = user.location ?? {};
  const socials = user.socials ?? {};
  const profileImage = user.profileImage ?? user.avatar ?? {};
  const coverImage = user.coverImage ?? {};

  const checks = {
    bio: hasText(user.bio) && user.bio.trim().length >= 20,
    skills: (user.skills?.length ?? 0) >= 3,
    interests: (user.interests?.length ?? 0) >= 3,
    occupation: hasText(user.occupation),
    education: (user.education?.length ?? 0) >= 1,
    experience: (user.experience?.length ?? 0) >= 1,
    projects: (user.projects?.length ?? 0) >= 1,
    location: hasText(location.city) || hasText(location.country),
    profileImage: hasText(profileImage.url),
    coverImage: hasText(coverImage.url),
    socials: hasText(socials.github) || hasText(socials.linkedin) || hasText(socials.website),
  };

  const breakdown = filled(checks);
  const earned = breakdown.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0);
  const percentage = Math.round((earned / TOTAL_WEIGHT) * 100);
  const missing = breakdown.filter((item) => !item.complete).map((item) => item.field);

  return {
    percentage,
    earned,
    total: TOTAL_WEIGHT,
    missing,
    breakdown,
  };
}

/**
 * Concatenates the fields the AI microservice will embed. Kept as a pure
 * function so matching can consume it later without reaching into Mongoose.
 */
export function buildEmbeddingSource(user = {}) {
  const education = (user.education ?? [])
    .map((item) => [item.school, item.degree, item.fieldOfStudy].filter(Boolean).join(' '))
    .join('. ');
  const experience = (user.experience ?? [])
    .map((item) => [item.title, item.company, item.description].filter(Boolean).join(' '))
    .join('. ');
  const projects = (user.projects ?? [])
    .map((item) => [item.title, item.description, ...(item.technologies ?? [])].filter(Boolean).join(' '))
    .join('. ');

  return [
    user.bio,
    user.occupation,
    (user.skills ?? []).join(', '),
    (user.interests ?? []).join(', '),
    education,
    experience,
    projects,
  ]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

export default scoreProfileCompleteness;
