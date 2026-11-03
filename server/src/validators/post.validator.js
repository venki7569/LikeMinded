import { z } from 'zod';

export const objectIdParam = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Must be a valid id');

const slugParam = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers and hyphens');

export const cursorPagination = {
  cursor: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

/** Validates http(s) URLs, rejecting dangerous protocols */
const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      const blocked = new Set(['javascript:', 'data:', 'vbscript:', 'file:']);
      if (blocked.has(parsed.protocol)) return false;
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
    url: httpUrl,
    publicId: z.string().max(200).optional().default(''),
  })
  .strict();

export const createPostSchema = {
  body: z
    .object({
      content: z.string().trim().max(5000).optional(),
      media: z.array(mediaInput).max(10).optional(),
      privacy: z.enum(['public', 'connections', 'private']).optional(),
      communityId: objectIdParam.optional().nullable(),
    })
    .strict()
    .refine(
      (data) => (data.content?.trim().length ?? 0) > 0 || (data.media?.length ?? 0) > 0,
      { message: 'Post must have content or media' }
    ),
};

export const updatePostSchema = {
  params: z.object({ postId: objectIdParam }).strict(),
  body: z
    .object({
      content: z.string().trim().max(5000).optional(),
      media: z.array(mediaInput).max(10).optional(),
      privacy: z.enum(['public', 'connections', 'private']).optional(),
    })
    .strict()
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'Provide at least one field to update' }
    ),
};

export const postIdParamSchema = {
  params: z.object({ postId: objectIdParam }).strict(),
};

export const feedQuerySchema = {
  query: z.object({ ...cursorPagination }).strict(),
};

export const commentCreateSchema = {
  params: z.object({ postId: objectIdParam }).strict(),
  body: z.object({ content: z.string().trim().min(1).max(2000) }).strict(),
};

export const commentUpdateSchema = {
  params: z.object({ postId: objectIdParam, commentId: objectIdParam }).strict(),
  body: z.object({ content: z.string().trim().min(1).max(2000) }).strict(),
};

export const commentIdParamSchema = {
  params: z.object({ postId: objectIdParam, commentId: objectIdParam }).strict(),
};

export const commentListQuerySchema = {
  params: z.object({ postId: objectIdParam }).strict(),
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .strict(),
};

export const usernamePostsQuerySchema = {
  params: z.object({ username: z.string().trim().min(1).max(40) }).strict(),
  query: z.object({ ...cursorPagination }).strict(),
};

export const communityPostsQuerySchema = {
  params: z.object({ slug: slugParam }).strict(),
  query: z.object({ ...cursorPagination }).strict(),
};
