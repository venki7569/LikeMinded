import mongoose from 'mongoose';
import { isAllowedHttpUrl } from '../utils/sanitize.js';

const { Schema, model } = mongoose;

export const POST_PRIVACY = Object.freeze({
  PUBLIC: 'public',
  CONNECTIONS: 'connections',
  PRIVATE: 'private',
});

const mediaSchema = new Schema(
  {
    url: {
      type: String,
      maxlength: 2048,
      validate: { validator: isAllowedHttpUrl, message: 'url must be a valid http(s) URL' },
    },
    publicId: { type: String, maxlength: 200, default: '' },
  },
  { _id: false }
);

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    community: { type: Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    content: { type: String, trim: true, maxlength: 5000, default: '' },
    media: {
      type: [mediaSchema],
      validate: {
        validator: (arr) => arr.length <= 10,
        message: 'A post may contain at most 10 images',
      },
      default: [],
    },
    privacy: {
      type: String,
      enum: Object.values(POST_PRIVACY),
      default: POST_PRIVACY.PUBLIC,
      index: true,
    },
    hashtags: { type: [{ type: String, trim: true, lowercase: true, maxlength: 60 }], default: [] },
    mentions: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    likeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
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

// Indexes for feed queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ privacy: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ mentions: 1 });
postSchema.index({ author: 1, privacy: 1, _id: -1 }); // cursor-paginated profile feed
postSchema.index({ community: 1, _id: -1 }); // cursor-paginated community feed

export const Post = model('Post', postSchema);
export default Post;
