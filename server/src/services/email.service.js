import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;

  if (!env.isEmailEnabled) {
    // Development fallback: render the message to the log instead of sending.
    cachedTransport = {
      sendMail: async (message) => {
        logger.info('Email (console transport)', {
          to: message.to,
          subject: message.subject,
          text: message.text,
        });
        return { messageId: 'console-transport' };
      },
    };
    return cachedTransport;
  }

  cachedTransport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  return cachedTransport;
}

function layout({ heading, body, actionLabel, actionUrl, footer }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#4f46e5">LikeMinded</p>
            <h1 style="margin:0 0 16px;font-size:22px">${heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3e4c59">${body}</p>
            <a href="${actionUrl}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600">${actionLabel}</a>
            <p style="margin:24px 0 0;font-size:13px;color:#7b8794">${footer}</p>
            <p style="margin:12px 0 0;font-size:12px;color:#9aa5b1;word-break:break-all">${actionUrl}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function send({ to, subject, text, html }) {
  try {
    await getTransport().sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
  } catch (error) {
    // A failed email must not fail the surrounding request (e.g. registration).
    logger.error('Failed to send email', { to, subject, message: error.message });
  }
}

export async function sendVerificationEmail(user, token) {
  const actionUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  await send({
    to: user.email,
    subject: 'Verify your LikeMinded email',
    text: `Welcome to LikeMinded, ${user.name}. Verify your email: ${actionUrl}`,
    html: layout({
      heading: `Welcome, ${user.name}`,
      body: 'Confirm your email address to activate your account and start finding like-minded people.',
      actionLabel: 'Verify email',
      actionUrl,
      footer: 'This link expires in 24 hours. If you did not sign up, you can ignore this email.',
    }),
  });
}

export async function sendPasswordResetEmail(user, token) {
  const actionUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  await send({
    to: user.email,
    subject: 'Reset your LikeMinded password',
    text: `Reset your password: ${actionUrl}`,
    html: layout({
      heading: 'Reset your password',
      body: 'We received a request to reset your password. Choose a new one using the button below.',
      actionLabel: 'Reset password',
      actionUrl,
      footer: 'This link expires in 1 hour. If you did not request a reset, no action is needed.',
    }),
  });
}

export async function sendPasswordChangedEmail(user) {
  const actionUrl = `${env.CLIENT_URL}/login`;
  await send({
    to: user.email,
    subject: 'Your LikeMinded password was changed',
    text: 'Your password was changed. If this was not you, reset it immediately.',
    html: layout({
      heading: 'Your password was changed',
      body: 'Your LikeMinded password was just updated and all other sessions were signed out.',
      actionLabel: 'Sign in',
      actionUrl,
      footer: 'If you did not make this change, reset your password immediately.',
    }),
  });
}

export default { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangedEmail };
