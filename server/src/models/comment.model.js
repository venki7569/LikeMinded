import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const commentSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, trim: true, maxlength: 2000, required: true },
    editedAt: { type: Date, default: null },
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

// Indexes for comment threads and cascade lookups
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ post: 1, _id: 1 });

export const Comment = model('Comment', commentSchema);
export default Comment;
