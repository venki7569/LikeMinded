import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { authLimiter, emailLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create an account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password]
 *             properties:
 *               name: { type: string, example: Ada Lovelace }
 *               username: { type: string, example: ada }
 *               email: { type: string, format: email, example: ada@example.com }
 *               password: { type: string, format: password, example: Passw0rd123 }
 *               confirmPassword: { type: string, format: password, example: Passw0rd123 }
 *     responses:
 *       201:
 *         description: Account created; refresh token set as an httpOnly cookie
 *       400: { description: Validation failed }
 *       409: { description: Email or username already taken }
 */
router.post('/register', authLimiter, validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Sign in with email or username
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier: { type: string, example: ada@example.com }
 *               password: { type: string, format: password, example: Passw0rd123 }
 *     responses:
 *       200: { description: Signed in }
 *       401: { description: Incorrect credentials }
 *       403: { description: Account deactivated or suspended }
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange the refresh cookie for a new access token
 *     description: Rotates the refresh token. Reuse of a rotated token revokes every session.
 *     tags: [Auth]
 *     responses:
 *       200: { description: New access token issued }
 *       401: { description: Missing, expired, or already-used refresh token }
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current session
 *     tags: [Auth]
 *     responses:
 *       200: { description: Signed out }
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Revoke every session for the current user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: All sessions revoked }
 *       401: { description: Authentication required }
 */
router.post('/logout-all', requireAuth, authController.logoutAll);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify an email address using the emailed token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Token invalid or expired }
 */
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Send a fresh verification email
 *     description: Always returns 200 so registered addresses cannot be enumerated.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Accepted }
 *       429: { description: Too many email requests }
 */
router.post(
  '/resend-verification',
  emailLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Always returns 200 so registered addresses cannot be enumerated.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Accepted }
 *       429: { description: Too many email requests }
 */
router.post(
  '/forgot-password',
  emailLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Set a new password using a reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Password reset; all sessions revoked }
 *       400: { description: Token invalid or expired }
 */
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @openapi
 * /auth/change-password:
 *   patch:
 *     summary: Change the password of the signed-in user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200: { description: Password changed; all sessions revoked }
 *       400: { description: Current password incorrect }
 *       401: { description: Authentication required }
 */
router.patch(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get the signed-in user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Authentication required }
 */
router.get('/me', requireAuth, authController.me);

export default router;
