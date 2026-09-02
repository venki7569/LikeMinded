import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Directed block: `blocker` hid `blocked`. Historical connection requests are
 * kept; pending ones are cancelled. A unique index stops a double-block.
 */
const blockSchema = new Schema(
  {
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

blockSchema.pre('validate', function rejectSelfBlock() {
  if (this.blocker && this.blocked && String(this.blocker) === String(this.blocked)) {
    this.invalidate('blocked', 'You cannot block yourself');
  }
});

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });
blockSchema.index({ blocker: 1, createdAt: -1 });

export const Block = model('Block', blockSchema);
export default Block;
