import mongoose from 'mongoose';
import { orderedPair } from '../utils/pair.js';

const { Schema, model } = mongoose;

/**
 * Accepted, undirected edge. `userLow`/`userHigh` are the two ids in
 * lexicographic order so the unique index cannot store A–B twice.
 * Removing or blocking sets `endedAt` instead of deleting the row.
 */
const connectionSchema = new Schema(
  {
    userLow: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userHigh: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pairKey: { type: String, required: true },
    request: { type: Schema.Types.ObjectId, ref: 'ConnectionRequest' },
    endedAt: { type: Date, default: null },
    endedReason: { type: String, enum: ['removed', 'blocked'] },
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

connectionSchema.pre('validate', function setPair() {
  if (this.userLow && this.userHigh) {
    if (String(this.userLow) === String(this.userHigh)) {
      this.invalidate('userHigh', 'A connection requires two different users');
    }
    const ordered = orderedPair(this.userLow, this.userHigh);
    this.userLow = ordered.userLow;
    this.userHigh = ordered.userHigh;
    this.pairKey = ordered.pairKey;
  }
});

connectionSchema.index({ userLow: 1, endedAt: 1 });
connectionSchema.index({ userHigh: 1, endedAt: 1 });
connectionSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { endedAt: null } }
);

export const Connection = model('Connection', connectionSchema);
export default Connection;
