import mongoose from 'mongoose';
import { pairKey } from '../utils/pair.js';

const { Schema, model } = mongoose;

export const REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const connectionRequestSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(REQUEST_STATUS),
      default: REQUEST_STATUS.PENDING,
      index: true,
    },
    // Sorted sender/receiver so A→B and B→A pending requests collide on one unique index.
    pairKey: { type: String, required: true },
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

connectionRequestSchema.pre('validate', function setPairKey() {
  if (this.sender && this.receiver) {
    if (String(this.sender) === String(this.receiver)) {
      this.invalidate('receiver', 'Cannot send a request to yourself');
    }
    this.pairKey = pairKey(this.sender, this.receiver);
  }
});

connectionRequestSchema.index({ receiver: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index({ sender: 1, status: 1, createdAt: -1 });
connectionRequestSchema.index({ pairKey: 1, status: 1 });
// One live pending request per pair, regardless of who initiated.
connectionRequestSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { status: REQUEST_STATUS.PENDING } }
);

export const ConnectionRequest = model('ConnectionRequest', connectionRequestSchema);
export default ConnectionRequest;
