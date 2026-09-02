import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const shared = {
  windowMs,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Limits would otherwise make tests order-dependent.
  skip: () => env.isTest,
  message: { success: false, message: 'Too many requests. Please try again later.' },
};

export const apiLimiter = rateLimit({
  ...shared,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
});

/** Tighter budget for credential endpoints to slow brute-force attempts. */
export const authLimiter = rateLimit({
  ...shared,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a few minutes.',
  },
});

/** Email-sending endpoints are the most expensive to abuse. */
export const emailLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: {
    success: false,
    message: 'Too many email requests. Please try again in an hour.',
  },
});

export default apiLimiter;
