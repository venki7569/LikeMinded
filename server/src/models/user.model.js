import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { isAllowedHttpUrl, uniqueNormalizedTags } from '../utils/sanitize.js';

const { Schema, model } = mongoose;

export const USER_ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

export const PROFILE_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
});

export const PROFILE_LIMITS = Object.freeze({
  skills: 20,
  interests: 20,
  education: 10,
  experience: 15,
  projects: 15,
  projectTechnologies: 12,
});

export const RESERVED_USERNAMES = Object.freeze(
  new Set([
    'me',
    'check-username',
    'admin',
    'api',
    'auth',
    'login',
    'register',
    'settings',
    'profile',
    'users',
    'user',
    'edit',
    'support',
    'help',
    'www',
    'root',
    'null',
    'undefined',
    'system',
    'likeminded',
  ])
);

const BCRYPT_ROUNDS = 12;

function httpUrlValidator(value) {
  return isAllowedHttpUrl(value);
}

const educationSchema = new Schema(
  {
    school: { type: String, required: true, trim: true, maxlength: 120 },
    degree: { type: String, trim: true, maxlength: 120, default: '' },
    fieldOfStudy: { type: String, trim: true, maxlength: 120, default: '' },
    startYear: { type: Number, min: 1800, max: 2100 },
    endYear: { type: Number, min: 1800, max: 2100 },
  },
  { _id: true }
);

educationSchema.pre('validate', function checkYears() {
  if (this.startYear && this.endYear && this.endYear < this.startYear) {
    this.invalidate('endYear', 'End year cannot be before start year');
  }
});

const experienceSchema = new Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 120 },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { _id: true }
);

experienceSchema.pre('validate', function checkDates() {
  if (this.isCurrent) this.endDate = undefined;
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date cannot be before start date');
  }
});

const mediaSchema = new Schema(
  {
    url: {
      type: String,
      default: '',
      maxlength: 2048,
      validate: { validator: httpUrlValidator, message: 'Must be an http(s) URL' },
    },
    // Empty until Cloudinary signed uploads write a public id into the same shape.
    publicId: { type: String, default: '', maxlength: 200 },
  },
  { _id: false }
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    url: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
      validate: { validator: httpUrlValidator, message: 'Must be an http(s) URL' },
    },
    technologies: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      validate: [
        (value) => value.length <= PROFILE_LIMITS.projectTechnologies,
        `At most ${PROFILE_LIMITS.projectTechnologies} technologies`,
      ],
    },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers and underscores'],
      validate: {
        validator: (value) => !RESERVED_USERNAMES.has(value),
        message: 'That username is reserved',
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      // Never returned unless explicitly selected.
      select: false,
    },
    role: { type: String, enum: Object.values(USER_ROLES), default: USER_ROLES.USER, index: true },
    profileVisibility: {
      type: String,
      enum: Object.values(PROFILE_VISIBILITY),
      default: PROFILE_VISIBILITY.PUBLIC,
      index: true,
    },

    avatar: { type: mediaSchema, default: () => ({}) },
    coverImage: { type: mediaSchema, default: () => ({}) },

    bio: { type: String, trim: true, maxlength: 500, default: '' },
    skills: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
      validate: [(value) => value.length <= PROFILE_LIMITS.skills, `At most ${PROFILE_LIMITS.skills} skills`],
    },
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
      default: [],
      validate: [
        (value) => value.length <= PROFILE_LIMITS.interests,
        `At most ${PROFILE_LIMITS.interests} interests`,
      ],
    },
    education: {
      type: [educationSchema],
      default: [],
      validate: [
        (value) => value.length <= PROFILE_LIMITS.education,
        `At most ${PROFILE_LIMITS.education} education entries`,
      ],
    },
    experience: {
      type: [experienceSchema],
      default: [],
      validate: [
        (value) => value.length <= PROFILE_LIMITS.experience,
        `At most ${PROFILE_LIMITS.experience} experience entries`,
      ],
    },
    projects: {
      type: [projectSchema],
      default: [],
      validate: [
        (value) => value.length <= PROFILE_LIMITS.projects,
        `At most ${PROFILE_LIMITS.projects} projects`,
      ],
    },

    socials: {
      github: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2048,
        validate: { validator: httpUrlValidator, message: 'GitHub must be an http(s) URL' },
      },
      linkedin: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2048,
        validate: { validator: httpUrlValidator, message: 'LinkedIn must be an http(s) URL' },
      },
      website: {
        type: String,
        trim: true,
        default: '',
        maxlength: 2048,
        validate: { validator: httpUrlValidator, message: 'Website must be an http(s) URL' },
      },
    },
    location: {
      city: { type: String, trim: true, maxlength: 80, default: '' },
      country: { type: String, trim: true, maxlength: 80, default: '' },
    },
    occupation: { type: String, trim: true, maxlength: 120, default: '' },

    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    communities: [{ type: Schema.Types.ObjectId, ref: 'Community' }],

    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    bannedReason: { type: String, default: '' },

    // Invalidates access tokens issued before a password change.
    passwordChangedAt: { type: Date },

    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ skills: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ name: 'text', username: 'text', bio: 'text' });

userSchema.index({ occupation: 1 });
userSchema.index({ profileVisibility: 1, username: 1 });

userSchema.virtual('followerCount').get(function followerCount() {
  return this.followers?.length ?? 0;
});

userSchema.virtual('followingCount').get(function followingCount() {
  return this.following?.length ?? 0;
});

// Spec aliases: stored as `name` / `avatar` so auth responses stay stable.
userSchema.virtual('displayName').get(function displayName() {
  return this.name;
});
userSchema.virtual('profileImage').get(function profileImage() {
  return this.avatar;
});

userSchema.pre('validate', function normalizeTags() {
  this.skills = uniqueNormalizedTags(this.skills, { maxItems: PROFILE_LIMITS.skills });
  this.interests = uniqueNormalizedTags(this.interests, { maxItems: PROFILE_LIMITS.interests });
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * @param {number} issuedAtMs Token issue time in milliseconds. The standard JWT
 * `iat` claim is only second-granular, which cannot distinguish a token from a
 * password change in the same second, so access tokens carry their own `iatMs`.
 */
userSchema.methods.hasPasswordChangedSince = function hasPasswordChangedSince(issuedAtMs) {
  if (!this.passwordChangedAt) return false;
  return this.passwordChangedAt.getTime() > issuedAtMs;
};

export const User = model('User', userSchema);
export default User;
