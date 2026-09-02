import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model } = mongoose;

export const USER_ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const BCRYPT_ROUNDS = 12;

const educationSchema = new Schema(
  {
    school: { type: String, required: true, trim: true, maxlength: 120 },
    degree: { type: String, trim: true, maxlength: 120 },
    fieldOfStudy: { type: String, trim: true, maxlength: 120 },
    startYear: { type: Number, min: 1950, max: 2100 },
    endYear: { type: Number, min: 1950, max: 2100 },
  },
  { _id: true }
);

const experienceSchema = new Schema(
  {
    company: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, trim: true, maxlength: 120 },
    startDate: { type: Date },
    endDate: { type: Date },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, trim: true, maxlength: 2000 },
  },
  { _id: true }
);

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    url: { type: String, trim: true, maxlength: 300 },
    technologies: [{ type: String, trim: true, maxlength: 40 }],
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

    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    coverImage: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    bio: { type: String, trim: true, maxlength: 500, default: '' },
    skills: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    interests: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    education: { type: [educationSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    projects: { type: [projectSchema], default: [] },

    socials: {
      github: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
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

userSchema.virtual('followerCount').get(function followerCount() {
  return this.followers?.length ?? 0;
});

userSchema.virtual('followingCount').get(function followingCount() {
  return this.following?.length ?? 0;
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
