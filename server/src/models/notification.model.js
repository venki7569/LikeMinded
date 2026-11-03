import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const NOTIFICATION_TYPES = Object.freeze({
  CONNECTION_REQUEST: 'connection_request',
  CONNECTION_ACCEPTED: 'connection_accepted',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',
  COMMUNITY_INVITE: 'community_invite',
  COMMUNITY_APPROVED: 'community_approved',
  SYSTEM: 'system',
});

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    entityModel: {
      type: String,
      enum: ['User', 'Post', 'Community', 'Comment', null],
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
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

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = model('Notification', notificationSchema);
export default Notification;
