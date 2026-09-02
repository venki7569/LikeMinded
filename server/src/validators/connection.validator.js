import { z } from 'zod';

export const objectIdParam = z
  .string()
  .regex(/^[a-f0-9]{24}$/i, 'Must be a valid user or request id');

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const paginationQuerySchema = {
  query: z.object(pagination).strict(),
};

export const listConnectionsQuerySchema = {
  query: z
    .object({
      ...pagination,
      q: z.string().trim().max(80).optional(),
    })
    .strict(),
};

export const peopleQuerySchema = {
  query: z
    .object({
      ...pagination,
      q: z.string().trim().max(80).optional(),
      skill: z.string().trim().max(40).optional(),
      skills: z.string().trim().max(200).optional(),
      interest: z.string().trim().max(40).optional(),
      interests: z.string().trim().max(200).optional(),
      occupation: z.string().trim().max(120).optional(),
      city: z.string().trim().max(80).optional(),
      country: z.string().trim().max(80).optional(),
    })
    .strict(),
};

export const sendRequestSchema = {
  body: z
    .object({
      userId: objectIdParam,
    })
    .strict(),
};

export const requestIdParamSchema = {
  params: z.object({ id: objectIdParam }).strict(),
};

export const userIdParamSchema = {
  params: z.object({ userId: objectIdParam }).strict(),
};

export const blockUserSchema = {
  body: z
    .object({
      userId: objectIdParam,
    })
    .strict(),
};
