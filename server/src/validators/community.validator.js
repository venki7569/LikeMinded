import { z } from 'zod';
import { COMMUNITY_CATEGORIES, COMMUNITY_PRIVACY } from '../models/community.model.js';
import { MEMBER_ROLES } from '../utils/communityPermissions.js';
import { JOIN_REQUEST_STATUS } from '../models/communityJoinRequest.model.js';

export const objectIdParam = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Must be a valid id');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

const slugParam = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers and hyphens');

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));

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

const mediaInput = z
  .object({
    url: httpUrl.optional().or(z.literal('')),
    publicId: z.string().max(200).optional(),
  })
  .strict()
  .optional();

const interests = z.array(z.string().trim().min(2).max(40)).max(20).optional();

export const slugParamSchema = {
  params: z.object({ slug: slugParam }).strict(),
};

export const createCommunitySchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      description: optionalText(2000),
      category: z.enum(COMMUNITY_CATEGORIES).optional(),
      interests,
      privacy: z.enum(Object.values(COMMUNITY_PRIVACY)).optional(),
      avatar: mediaInput,
      coverImage: mediaInput,
    })
    .strict(),
};

export const updateCommunitySchema = {
  params: z.object({ slug: slugParam }).strict(),
  body: z
    .object({
      name: z.string().trim().min(2).max(80).optional(),
      description: optionalText(2000),
      category: z.enum(COMMUNITY_CATEGORIES).optional(),
      interests,
      privacy: z.enum(Object.values(COMMUNITY_PRIVACY)).optional(),
      avatar: mediaInput,
      coverImage: mediaInput,
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
};

export const listCommunitiesQuerySchema = {
  query: z
    .object({
      ...pagination,
      q: z.string().trim().max(80).optional(),
      category: z.enum(COMMUNITY_CATEGORIES).optional(),
      interest: z.string().trim().max(40).optional(),
      interests: z.string().trim().max(200).optional(),
      privacy: z.enum(Object.values(COMMUNITY_PRIVACY)).optional(),
      sort: z.enum(['newest', 'members']).optional(),
      mine: z
        .union([z.literal('true'), z.literal('1'), z.literal('false'), z.literal('')])
        .optional(),
    })
    .strict(),
};

export const listMembersQuerySchema = {
  params: z.object({ slug: slugParam }).strict(),
  query: z
    .object({
      ...pagination,
      q: z.string().trim().max(80).optional(),
      role: z.enum(Object.values(MEMBER_ROLES)).optional(),
      sort: z.enum(['joined', 'role']).optional(),
    })
    .strict(),
};

export const listJoinRequestsQuerySchema = {
  params: z.object({ slug: slugParam }).strict(),
  query: z
    .object({
      ...pagination,
      status: z.enum(Object.values(JOIN_REQUEST_STATUS)).optional(),
    })
    .strict(),
};

export const requestIdParamSchema = {
  params: z.object({ slug: slugParam, requestId: objectIdParam }).strict(),
};

export const memberParamSchema = {
  params: z.object({ slug: slugParam, userId: objectIdParam }).strict(),
};

export const invitationCreateSchema = {
  params: z.object({ slug: slugParam }).strict(),
  body: z.object({ userId: objectIdParam }).strict(),
};

export const invitationIdParamSchema = {
  params: z.object({ invitationId: objectIdParam }).strict(),
};

export const transferOwnershipSchema = {
  params: z.object({ slug: slugParam }).strict(),
  body: z.object({ userId: objectIdParam }).strict(),
};

export const paginationQuerySchema = {
  query: z.object(pagination).strict(),
};
