import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const TOKEN_TYPES = Object.freeze({
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
});

/**
 * Stores only SHA-256 hashes of issued tokens, so a database leak cannot be
 * replayed against the API. Expired documents are removed by a TTL index.
 */
const tokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    type: { type: String, enum: Object.values(TOKEN_TYPES), required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    revokedAt: { type: Date },
    // Set when a refresh token is rotated, so reuse of an old token is detectable.
    replacedByHash: { type: String },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user: 1, type: 1 });

tokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && !this.usedAt && this.expiresAt.getTime() > Date.now();
};

export const Token = model('Token', tokenSchema);
export default Token;
