import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const JOIN_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const joinRequestSchema = new Schema(
  {
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(JOIN_REQUEST_STATUS),
      default: JOIN_REQUEST_STATUS.PENDING,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
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

joinRequestSchema.index(
  { community: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: JOIN_REQUEST_STATUS.PENDING } }
);
joinRequestSchema.index({ community: 1, status: 1, createdAt: -1 });
joinRequestSchema.index({ user: 1, status: 1, createdAt: -1 });

export const CommunityJoinRequest = model('CommunityJoinRequest', joinRequestSchema);
export default CommunityJoinRequest;
