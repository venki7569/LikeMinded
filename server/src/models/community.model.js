import mongoose from 'mongoose';
import { isAllowedHttpUrl } from '../utils/sanitize.js';

const { Schema, model } = mongoose;

export const COMMUNITY_PRIVACY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

export const COMMUNITY_CATEGORIES = Object.freeze([
  'technology',
  'science',
  'arts',
  'career',
  'education',
  'health',
  'sports',
  'gaming',
  'music',
  'other',
]);

export const COMMUNITY_LIMITS = Object.freeze({
  name: 80,
  slug: 60,
  description: 2000,
  interests: 20,
  interestLength: 40,
});

export const RESERVED_COMMUNITY_SLUGS = Object.freeze(
  new Set([
    'create',
    'new',
    'invitations',
    'invitation',
    'mine',
    'me',
    'admin',
    'settings',
    'members',
    'requests',
    'join',
    'leave',
    'api',
    'communities',
    'community',
    'discover',
    'search',
    'null',
    'undefined',
  ])
);

function httpUrlValidator(value) {
  return isAllowedHttpUrl(value);
}

const mediaSchema = {
  url: {
    type: String,
    trim: true,
    default: '',
    maxlength: 2048,
    validate: { validator: httpUrlValidator, message: 'Image must be an http(s) URL' },
  },
  publicId: { type: String, trim: true, default: '', maxlength: 200 },
};

const communitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: COMMUNITY_LIMITS.name },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: COMMUNITY_LIMITS.slug,
    },
    description: { type: String, trim: true, default: '', maxlength: COMMUNITY_LIMITS.description },
    category: {
      type: String,
      enum: COMMUNITY_CATEGORIES,
      default: 'other',
      index: true,
    },
    interests: {
      type: [String],
      default: [],
      validate: [
        (value) => value.length <= COMMUNITY_LIMITS.interests,
        `At most ${COMMUNITY_LIMITS.interests} interests`,
      ],
    },
    avatar: mediaSchema,
    coverImage: mediaSchema,
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    privacy: {
      type: String,
      enum: Object.values(COMMUNITY_PRIVACY),
      default: COMMUNITY_PRIVACY.PUBLIC,
      index: true,
    },
    memberCount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret.id ?? ret._id?.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

communitySchema.index({ slug: 1 }, { unique: true });
communitySchema.index({ category: 1, createdAt: -1 });
communitySchema.index({ interests: 1 });
communitySchema.index({ privacy: 1, createdAt: -1 });
communitySchema.index({ name: 'text', description: 'text', slug: 'text', category: 'text' });
communitySchema.index({ createdAt: -1 });

export const Community = model('Community', communitySchema);
export default Community;
