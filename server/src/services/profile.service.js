import User, {
  PROFILE_LIMITS,
  PROFILE_VISIBILITY,
  RESERVED_USERNAMES,
  USER_ROLES,
} from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { areConnected, targetBlockedViewer } from './connection.service.js';
import {
  buildEmbeddingSource,
  scoreProfileCompleteness,
} from '../utils/profileCompleteness.js';
import { assertHttpUrl, sanitizePlainText, uniqueNormalizedTags } from '../utils/sanitize.js';

const OWNER_FIELDS = [
  'name',
  'username',
  'email',
  'role',
  'profileVisibility',
  'bio',
  'occupation',
  'skills',
  'interests',
  'education',
  'experience',
  'projects',
  'socials',
  'location',
  'avatar',
  'coverImage',
  'isEmailVerified',
  'createdAt',
  'updatedAt',
  'followers',
  'following',
  'communities',
];

const PUBLIC_FIELDS = OWNER_FIELDS.filter((field) => field !== 'email' && field !== 'role');

function safeUrl(value, field) {
  try {
    return assertHttpUrl(value, { field });
  } catch (error) {
    throw ApiError.badRequest(error.message);
  }
}

function asMedia(input) {
  if (input == null) return undefined;
  const url = safeUrl(input.url ?? '', 'image URL');
  return { url, publicId: url ? (input.publicId ?? '') : '' };
}

function sanitizeEducation(entries) {
  return (entries ?? []).slice(0, PROFILE_LIMITS.education).map((entry) => ({
    school: sanitizePlainText(entry.school, { maxLength: 120 }),
    degree: sanitizePlainText(entry.degree, { maxLength: 120 }),
    fieldOfStudy: sanitizePlainText(entry.fieldOfStudy, { maxLength: 120 }),
    startYear: entry.startYear ?? undefined,
    endYear: entry.endYear ?? undefined,
  }));
}

function sanitizeExperience(entries) {
  return (entries ?? []).slice(0, PROFILE_LIMITS.experience).map((entry) => {
    const isCurrent = Boolean(entry.isCurrent);
    return {
      company: sanitizePlainText(entry.company, { maxLength: 120 }),
      title: sanitizePlainText(entry.title, { maxLength: 120 }),
      location: sanitizePlainText(entry.location, { maxLength: 120 }),
      startDate: entry.startDate || undefined,
      endDate: isCurrent ? undefined : entry.endDate || undefined,
      isCurrent,
      description: sanitizePlainText(entry.description, { maxLength: 2000 }),
    };
  });
}

function sanitizeProjects(entries) {
  return (entries ?? []).slice(0, PROFILE_LIMITS.projects).map((entry) => ({
    title: sanitizePlainText(entry.title, { maxLength: 120 }),
    description: sanitizePlainText(entry.description, { maxLength: 2000 }),
    url: safeUrl(entry.url ?? '', 'project URL'),
    technologies: uniqueNormalizedTags(entry.technologies, {
      maxItems: PROFILE_LIMITS.projectTechnologies,
    }),
  }));
}

function toProfileDto(user, { isOwner = false, completeness } = {}) {
  const json = user.toJSON();
  const dto = {
    id: json.id ?? json._id?.toString(),
    displayName: json.name,
    name: json.name,
    username: json.username,
    bio: json.bio,
    occupation: json.occupation,
    location: json.location,
    skills: json.skills,
    interests: json.interests,
    education: json.education,
    experience: json.experience,
    projects: json.projects,
    socials: json.socials,
    profileImage: json.avatar ?? { url: '', publicId: '' },
    avatar: json.avatar ?? { url: '', publicId: '' },
    coverImage: json.coverImage ?? { url: '', publicId: '' },
    profileVisibility: json.profileVisibility,
    followerCount: json.followerCount,
    followingCount: json.followingCount,
    isEmailVerified: json.isEmailVerified,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
    isOwner,
  };

  if (isOwner) {
    dto.email = json.email;
    dto.role = json.role;
    dto.completeness = completeness ?? scoreProfileCompleteness(json);
    dto.embeddingSource = buildEmbeddingSource(json);
  }

  return dto;
}

function canViewProfile(profile, viewer) {
  if (profile.profileVisibility !== PROFILE_VISIBILITY.PRIVATE) return true;
  if (!viewer) return false;
  if (viewer.id === profile.id || viewer._id?.equals?.(profile._id)) return true;
  return viewer.role === USER_ROLES.ADMIN || viewer.role === USER_ROLES.MODERATOR;
}

export async function getOwnProfile(userId) {
  const user = await User.findById(userId).select(OWNER_FIELDS.join(' '));
  if (!user) throw ApiError.notFound('Account no longer exists');
  return toProfileDto(user, { isOwner: true });
}

export async function getProfileByUsername(username, viewer) {
  const user = await User.findOne({ username, isActive: true, isBanned: false }).select(
    PUBLIC_FIELDS.join(' ')
  );
  if (!user) throw ApiError.notFound('User not found');

  if (viewer && (await targetBlockedViewer(user.id, viewer.id))) {
    throw ApiError.notFound('User not found');
  }

  const isOwner = Boolean(viewer && (viewer.id === user.id || viewer._id?.equals?.(user._id)));
  const connected =
    Boolean(viewer) && !isOwner && (await areConnected(viewer.id, user.id));

  if (!canViewProfile(user, viewer) && !connected) {
    throw ApiError.forbidden('This profile is private');
  }

  return toProfileDto(user, { isOwner });
}

export async function updateOwnProfile(userId, payload) {
  const user = await User.findById(userId).select(OWNER_FIELDS.join(' '));
  if (!user) throw ApiError.notFound('Account no longer exists');

  const nextUsername = payload.username?.trim().toLowerCase();
  if (nextUsername && nextUsername !== user.username) {
    if (RESERVED_USERNAMES.has(nextUsername)) {
      throw ApiError.badRequest('That username is reserved', { field: 'username' });
    }
    const taken = await User.exists({ username: nextUsername, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('That username is already taken', { field: 'username' });
    user.username = nextUsername;
  }

  if (payload.displayName != null || payload.name != null) {
    user.name = sanitizePlainText(payload.displayName ?? payload.name, { maxLength: 80 });
  }
  if (payload.bio != null) user.bio = sanitizePlainText(payload.bio, { maxLength: 500 });
  if (payload.occupation != null) {
    user.occupation = sanitizePlainText(payload.occupation, { maxLength: 120 });
  }
  if (payload.profileVisibility != null) user.profileVisibility = payload.profileVisibility;

  if (payload.location) {
    user.location = {
      city: sanitizePlainText(payload.location.city, { maxLength: 80 }),
      country: sanitizePlainText(payload.location.country, { maxLength: 80 }),
    };
  }

  if (payload.socials) {
    user.socials = {
      github: safeUrl(payload.socials.github ?? '', 'GitHub URL'),
      linkedin: safeUrl(payload.socials.linkedin ?? '', 'LinkedIn URL'),
      website: safeUrl(payload.socials.website ?? '', 'Website URL'),
    };
  }

  const profileImage = payload.profileImage ?? payload.avatar;
  if (profileImage) {
    user.avatar = asMedia(profileImage);
  }
  if (payload.coverImage) {
    user.coverImage = asMedia(payload.coverImage);
  }

  if (payload.skills) {
    user.skills = uniqueNormalizedTags(payload.skills, { maxItems: PROFILE_LIMITS.skills });
  }
  if (payload.interests) {
    user.interests = uniqueNormalizedTags(payload.interests, { maxItems: PROFILE_LIMITS.interests });
  }
  if (payload.education) user.education = sanitizeEducation(payload.education);
  if (payload.experience) user.experience = sanitizeExperience(payload.experience);
  if (payload.projects) user.projects = sanitizeProjects(payload.projects);

  await user.save();
  return toProfileDto(user, { isOwner: true });
}

export async function replaceSkills(userId, skills) {
  return updateOwnProfile(userId, { skills });
}

export async function replaceInterests(userId, interests) {
  return updateOwnProfile(userId, { interests });
}

export async function checkUsernameAvailability(username, viewerId) {
  const normalized = username.trim().toLowerCase();
  if (RESERVED_USERNAMES.has(normalized)) {
    return { username: normalized, available: false, reason: 'reserved' };
  }

  const existing = await User.findOne({ username: normalized }).select('_id').lean();
  if (!existing) return { username: normalized, available: true };

  const isOwn = viewerId && existing._id.toString() === viewerId.toString();
  return {
    username: normalized,
    available: Boolean(isOwn),
    reason: isOwn ? 'current' : 'taken',
  };
}

export async function getOwnCompleteness(userId) {
  const user = await User.findById(userId).select(OWNER_FIELDS.join(' '));
  if (!user) throw ApiError.notFound('Account no longer exists');
  const completeness = scoreProfileCompleteness(user.toJSON());
  return {
    ...completeness,
    embeddingSourcePreview: buildEmbeddingSource(user.toJSON()).slice(0, 280),
  };
}
