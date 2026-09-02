import mongoose from 'mongoose';
import { MEMBER_ROLES } from '../utils/communityPermissions.js';

const { Schema, model } = mongoose;

const membershipSchema = new Schema(
  {
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(MEMBER_ROLES),
      default: MEMBER_ROLES.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
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

membershipSchema.index({ community: 1, user: 1 }, { unique: true });
membershipSchema.index({ community: 1, role: 1 });
membershipSchema.index({ user: 1, createdAt: -1 });
membershipSchema.index({ community: 1, joinedAt: -1 });

export const CommunityMembership = model('CommunityMembership', membershipSchema);
export default CommunityMembership;
