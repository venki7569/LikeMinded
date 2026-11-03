import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const postLikeSchema = new Schema(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

postLikeSchema.index({ post: 1, user: 1 }, { unique: true });
postLikeSchema.index({ user: 1, createdAt: -1 });
postLikeSchema.index({ post: 1, createdAt: -1 });

export const PostLike = model('PostLike', postLikeSchema);
export default PostLike;
