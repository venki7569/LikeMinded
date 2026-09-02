import { z } from 'zod';
import { PROFILE_LIMITS, PROFILE_VISIBILITY, RESERVED_USERNAMES } from '../models/user.model.js';

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''));

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }, 'Must be a valid http(s) URL without credentials');

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores')
  .refine((value) => !RESERVED_USERNAMES.has(value), 'That username is reserved');

const tagList = (label, maxItems) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(2, `${label} must be at least 2 characters`)
        .max(40, `${label} must be at most 40 characters`)
    )
    .max(maxItems, `At most ${maxItems} ${label}s`)
    .optional();

const educationEntry = z
  .object({
    _id: z.string().optional(),
    school: z.string().trim().min(2).max(120),
    degree: optionalText(120),
    fieldOfStudy: optionalText(120),
    startYear: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
    endYear: z.coerce.number().int().min(1800).max(2100).optional().nullable(),
  })
  .strict()
  .refine((entry) => !entry.startYear || !entry.endYear || entry.endYear >= entry.startYear, {
    message: 'End year cannot be before start year',
    path: ['endYear'],
  });

const experienceEntry = z
  .object({
    _id: z.string().optional(),
    company: z.string().trim().min(2).max(120),
    title: z.string().trim().min(2).max(120),
    location: optionalText(120),
    startDate: z.union([z.coerce.date(), z.literal(''), z.null()]).optional(),
    endDate: z.union([z.coerce.date(), z.literal(''), z.null()]).optional(),
    isCurrent: z.boolean().optional(),
    description: optionalText(2000),
  })
  .strict()
  .refine(
    (entry) =>
      entry.isCurrent ||
      !entry.startDate ||
      !entry.endDate ||
      entry.endDate === '' ||
      entry.startDate === '' ||
      new Date(entry.endDate) >= new Date(entry.startDate),
    { message: 'End date cannot be before start date', path: ['endDate'] }
  );

const projectEntry = z
  .object({
    _id: z.string().optional(),
    title: z.string().trim().min(2).max(120),
    description: optionalText(2000),
    url: httpUrl.optional().or(z.literal('')),
    technologies: z.array(z.string().trim().max(40)).max(PROFILE_LIMITS.projectTechnologies).optional(),
  })
  .strict();

const mediaInput = z
  .object({
    url: httpUrl.optional().or(z.literal('')),
    publicId: z.string().max(200).optional(),
  })
  .strict()
  .optional();

export const updateProfileSchema = {
  body: z
    .object({
      displayName: z.string().trim().min(2).max(80).optional(),
      name: z.string().trim().min(2).max(80).optional(),
      username: username.optional(),
      bio: optionalText(500),
      occupation: optionalText(120),
      profileVisibility: z.enum(Object.values(PROFILE_VISIBILITY)).optional(),
      location: z
        .object({
          city: optionalText(80),
          country: optionalText(80),
        })
        .strict()
        .optional(),
      socials: z
        .object({
          github: httpUrl.optional().or(z.literal('')),
          linkedin: httpUrl.optional().or(z.literal('')),
          website: httpUrl.optional().or(z.literal('')),
        })
        .strict()
        .optional(),
      profileImage: mediaInput,
      avatar: mediaInput,
      coverImage: mediaInput,
      skills: tagList('skill', PROFILE_LIMITS.skills),
      interests: tagList('interest', PROFILE_LIMITS.interests),
      education: z.array(educationEntry).max(PROFILE_LIMITS.education).optional(),
      experience: z.array(experienceEntry).max(PROFILE_LIMITS.experience).optional(),
      projects: z.array(projectEntry).max(PROFILE_LIMITS.projects).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
};

export const patchSkillsSchema = {
  body: z
    .object({
      skills: z
        .array(z.string().trim().min(2).max(40))
        .max(PROFILE_LIMITS.skills, `At most ${PROFILE_LIMITS.skills} skills`),
    })
    .strict(),
};

export const patchInterestsSchema = {
  body: z
    .object({
      interests: z
        .array(z.string().trim().min(2).max(40))
        .max(PROFILE_LIMITS.interests, `At most ${PROFILE_LIMITS.interests} interests`),
    })
    .strict(),
};

export const usernameParamSchema = {
  params: z.object({ username }).strict(),
};

export const checkUsernameParamSchema = {
  params: z
    .object({
      username: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'),
    })
    .strict(),
};
