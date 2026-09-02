import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const INVITATION_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const invitationSchema = new Schema(
  {
    community: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(INVITATION_STATUS),
      default: INVITATION_STATUS.PENDING,
    },
    respondedAt: { type: Date },
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

invitationSchema.pre('validate', function rejectSelfInvite() {
  if (this.inviter && this.invitee && String(this.inviter) === String(this.invitee)) {
    this.invalidate('invitee', 'You cannot invite yourself');
  }
});

invitationSchema.index(
  { community: 1, invitee: 1 },
  { unique: true, partialFilterExpression: { status: INVITATION_STATUS.PENDING } }
);
invitationSchema.index({ invitee: 1, status: 1, createdAt: -1 });
invitationSchema.index({ community: 1, status: 1, createdAt: -1 });

export const CommunityInvitation = model('CommunityInvitation', invitationSchema);
export default CommunityInvitation;
