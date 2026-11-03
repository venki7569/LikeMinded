import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const lastMessageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    body: { type: String, maxlength: 3000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    pairKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    lastMessage: {
      type: lastMessageSchema,
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

conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = model('Conversation', conversationSchema);
export default Conversation;
