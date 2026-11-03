import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    attachments: [
      {
        url: { type: String, maxlength: 2048 },
        type: { type: String, default: 'image' },
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ conversation: 1, _id: -1 });

export const Message = model('Message', messageSchema);
export default Message;
